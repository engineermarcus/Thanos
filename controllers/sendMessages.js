import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { executeCode } from "../utilities/thread.js";
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function extractNumber(jid) {
    return jid ? jid.split('@')[0].split(':')[0] : '';
}

export function getRandomEmoji() {
    const emojis = ['😊', '😂', '🥰', '😅', '😭', '🤔', '👍', '❤️', '🔥', '✨', '🎉', '💯', '🙏', '👏', '💪', '🤝', '😎', '🥳', '😍', '🤗', '💀', '☺️', '🌟', '💙', '🎊', '🌈', '⭐', '💚', '🙌', '😌', '🫶', '💜', '🤩', '😏', '🎶', '✅', '💖', '🌸', '☀️', '🌺'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

export async function viewStatus(sock, message) {
    try {
        await sock.readMessages([message.key]);
        console.log('✅ Viewed status from:', message.pushName);
    } catch (error) {
        console.error('❌ Error viewing status:', error);
    }
}

export async function downloadStatusImage(sock, message) {
    try {
        const messageContent = message.message;
        if (!messageContent?.imageMessage) return null;

        const sender = message.pushName || 'Unknown';
        const buffer = await downloadMediaMessage(
            message,
            'buffer',
            {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
        );

        const statusesDir = './statuses';
        if (!fs.existsSync(statusesDir)) {
            fs.mkdirSync(statusesDir, { recursive: true });
        }

        const filename = `${sender.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.jpg`;
        const filepath = path.join(statusesDir, filename);
        fs.writeFileSync(filepath, buffer);

        console.log('💾 Status saved to:', filepath);
        return { sender, filepath };
    } catch (error) {
        console.error('❌ Error saving status image:', error);
        return null;
    }
}

export async function likeStatus(sock, message) {
    try {
        const emoji = getRandomEmoji();
        const participant = message.key.participant;
        if (!participant) return;
        await sock.sendMessage(participant, { react: { text: emoji, key: message.key } });
    } catch (error) {
        console.error('❌ Error liking status:', error.message);
    }
}

// ============================================
// NEW: VIDEO TO STICKER FUNCTION
// ============================================

async function videoToSticker(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log('🎬 Converting video to sticker with compression...');

        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-vcodec', 'libwebp',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=10,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000', // Scale, 10fps, and transparent padding
            '-lossless', '0',               // Use lossy compression
            '-compression_level', '6',      // Slow but better compression
            '-q:v', '40',                   // Lowered quality (0-100, 40 is good balance)
            '-loop', '0',
            '-an',                          // No audio
            '-vsync', '0',
            '-t', '7',                      // Shortened to 7 seconds to save space
            '-y',
            outputPath
        ]);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => stderr += data.toString());

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                const stats = fs.statSync(outputPath);
                const sizeKB = (stats.size / 1024).toFixed(2);
                console.log(`✅ Sticker created: ${sizeKB}KB`);

                // WhatsApp's hard limit is 1MB (1024KB), but 800KB is safer for loading
                if (stats.size > 1024 * 1024) { 
                    reject(new Error(`Still too large: ${sizeKB}KB. Try a shorter video.`));
                } else {
                    resolve(outputPath);
                }
            } else {
                reject(new Error(`FFmpeg failed: ${stderr}`));
            }
        });
    });
}

async function imageToSticker(imagePath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log('🖼️ Converting image to sticker...');

        const ffmpeg = spawn('ffmpeg', [
            '-i', imagePath,
            '-vcodec', 'libwebp',
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
            '-lossless', '0',
            '-compression_level', '6',
            '-q:v', '75', // Higher quality for still images
            '-y',
            outputPath
        ]);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => stderr += data.toString());

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                const stats = fs.statSync(outputPath);
                console.log(`✅ Image sticker created: ${(stats.size / 1024).toFixed(2)}KB`);
                resolve(outputPath);
            } else {
                reject(new Error(`FFmpeg failed: ${stderr}`));
            }
        });
    });
}

async function gifToSticker(gifPath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log('🎨 Converting GIF to sticker...');

        const ffmpeg = spawn('ffmpeg', [
            '-i', gifPath,
            '-vcodec', 'libwebp',
            '-vf', 'fps=15,scale=512:512:flags=lanczos',
            '-loop', '0',
            '-preset', 'default',
            '-an',
            '-vsync', '0',
            '-compression_level', '6',
            '-q:v', '75',
            '-y',
            outputPath
        ]);

        let stderr = '';

        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                const stats = fs.statSync(outputPath);
                const sizeKB = (stats.size / 1024).toFixed(2);
                console.log(`✅ Sticker created: ${sizeKB}KB`);

                if (stats.size > 500 * 1024) {
                    reject(new Error(`File too large: ${sizeKB}KB (max 500KB)`));
                } else {
                    resolve(outputPath);
                }
            } else {
                reject(new Error(`FFmpeg failed: ${stderr}`));
            }
        });

        ffmpeg.on('error', (err) => {
            reject(new Error(`FFmpeg error: ${err.message}`));
        });
    });
}
async function handleStickerCommand(WASocket, rawMessage, chatJid, quotedMsg) {
    const tempDir = './temp_stickers';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    try {
        const contextInfo = rawMessage.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        
        if (!quotedMessage) {
            await WASocket.sendMessage(chatJid, { text: '❌ Please reply to an image, video, or GIF with "sticker"' }, { quoted: quotedMsg });
            return;
        }

        const downloadObject = {
            message: quotedMessage,
            key: {
                remoteJid: chatJid,
                fromMe: false,
                id: contextInfo.stanzaId,
                participant: contextInfo.participant
            }
        };

        let inputPath;
        let type = ''; // 'video', 'gif', or 'image'

        if (quotedMessage.videoMessage) {
            type = 'video';
            inputPath = path.join(tempDir, `video_${Date.now()}.mp4`);
        } 
        else if (quotedMessage.imageMessage) {
            type = (quotedMessage.imageMessage.mimetype === 'image/gif') ? 'gif' : 'image';
            const ext = type === 'gif' ? 'gif' : 'jpg';
            inputPath = path.join(tempDir, `media_${Date.now()}.${ext}`);
        }
        else {
            await WASocket.sendMessage(chatJid, { text: '❌ Only images, videos, or GIFs can be stickers.' }, { quoted: quotedMsg });
            return;
        }

        await WASocket.sendMessage(chatJid, { text: `🎨 Forging your ${type} sticker...` }, { quoted: quotedMsg });

        const buffer = await downloadMediaMessage(
            downloadObject,
            'buffer',
            {},
            { logger: console, reuploadRequest: WASocket.updateMediaMessage }
        );
        fs.writeFileSync(inputPath, buffer);

        const stickerPath = path.join(tempDir, `sticker_${Date.now()}.webp`);
        
        // Route to the correct converter
        if (type === 'video') await videoToSticker(inputPath, stickerPath);
        else if (type === 'gif') await gifToSticker(inputPath, stickerPath);
        else await imageToSticker(inputPath, stickerPath);

        const stickerBuffer = fs.readFileSync(stickerPath);
        await WASocket.sendMessage(chatJid, { sticker: stickerBuffer }, { quoted: quotedMsg });

        // Clean up
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(stickerPath)) fs.unlinkSync(stickerPath);

    } catch (error) {
        console.error('❌ Sticker failed:', error);
        await WASocket.sendMessage(chatJid, { text: `❌ Failed: ${error.message}` }, { quoted: quotedMsg });
    }
}

export function extractMessageInfo(msg) {
    // Safety check
    if (!msg || !msg.key || !msg.key.remoteJid) {
        console.error('❌ extractMessageInfo: Invalid message object');
        return {
            chatType: 'UNKNOWN',
            from: null,
            replyTo: null,
            sender: null,
            senderName: 'Unknown',
            messageContent: '',
            timestamp: new Date()
        };
    }

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || msg.verifiedBizName || 'Unknown';
    
    let chatType = 'PRIVATE';
    if (from?.endsWith('@g.us')) chatType = 'GROUP';
    else if (from?.endsWith('@newsletter')) chatType = 'CHANNEL';
    else if (from === 'status@broadcast') chatType = 'STATUS';

    let replyTo;
    if (chatType === 'GROUP') {
        replyTo = from;
    } else {
        replyTo = from;
        if (replyTo && !replyTo.includes('@')) {
            replyTo = replyTo + '@s.whatsapp.net';
        }
    }

    let messageContent = '';
    const messageType = msg.message ? Object.keys(msg.message)[0] : null;
    
    if (messageType) {
        switch (messageType) {
            case 'conversation':
                messageContent = msg.message.conversation;
                break;
            case 'extendedTextMessage':
                messageContent = msg.message.extendedTextMessage?.text || '';
                break;
            case 'imageMessage':
                messageContent = '[Image]' + (msg.message.imageMessage?.caption ? ` - ${msg.message.imageMessage.caption}` : '');
                break;
            case 'videoMessage':
                messageContent = '[Video]' + (msg.message.videoMessage?.caption ? ` - ${msg.message.videoMessage.caption}` : '');
                break;
            case 'audioMessage':
                messageContent = msg.message.audioMessage?.ptt ? '[Voice Note]' : '[Audio]';
                break;
            case 'documentMessage':
                messageContent = `[Document: ${msg.message.documentMessage?.fileName || 'file'}]`;
                break;
            case 'stickerMessage':
                messageContent = '[Sticker]';
                break;
            default:
                messageContent = '[Unknown message type]';
        }
    }

    // ✅ Return FULL object with all properties
    return { 
        chatType, 
        from, 
        replyTo,
        sender, 
        senderName,  // ← Name is here in the object
        messageContent, 
        timestamp: new Date(msg.messageTimestamp * 1000) 
    };
}


// ============================================
// MAIN MESSAGE HANDLER
// ============================================


export async function message(WASocket, clientMessage, chatJid, quotedMsg, masterNumber, senderJid, isFromMe, rawMessage) {

    // 1. STATUS HANDLER (View, Download, and Like)
    if (rawMessage.key.remoteJid === 'status@broadcast') {
        const messageContent = rawMessage.message;
        
        setTimeout(async () => {
            await viewStatus(WASocket, rawMessage);
            if (messageContent?.imageMessage) {
                await downloadStatusImage(WASocket, rawMessage);
            }
        }, 5000);

        setTimeout(async () => {
            await likeStatus(WASocket, rawMessage);
        }, 30000);
        return;
    }

    const lowerMsg = clientMessage.trim().toLowerCase();
    const firstWord = lowerMsg.split(/\s+/)[0];
    const senderNumber = extractNumber(senderJid);
    const isMaster = senderNumber === masterNumber || isFromMe;

    // 2. STICKER COMMAND
    if (lowerMsg === 'sticker' || lowerMsg === '.sticker') {
        await handleStickerCommand(WASocket, rawMessage, chatJid, quotedMsg);
        return;
    }

    // 3. CODE EXECUTION
    const executables = [
        "py", "python", "python3", "js", "node", "javascript", "java", 
        "kt", "kotlin", "cpp", "c++", "c", "go", "golang", "rs", "rust", 
        "ts", "typescript", "php", "rb", "ruby", "lua", "sh", "bash"
    ];

    if (executables.includes(firstWord)) {
        try {
            const startText = isMaster ? `Sire, reality is being rewritten...` : `⏳ Processing...`;
           // await WASocket.sendMessage(chatJid, { text: startText }, { quoted: quotedMsg });

            const output = await executeCode(clientMessage,rawMessage);
            const response = `*======TERMINAL OUTPUT=======*\n\n${output || 'Done (No output)'}\n==============`;
            await WASocket.sendMessage(chatJid, { text: response }, { quoted: quotedMsg });
        } catch (error) {
            await WASocket.sendMessage(chatJid, { 
                text: `❌ *ERROR*\n\n\`\`\`\n${error.message}\n\`\`\`` 
            }, { quoted: quotedMsg });
        }
    }
}
