import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { executeCode } from "../utilities/thread.js";
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

// --- RESTORED FUNCTION ----
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

export async function message(WASocket, clientMessage, chatJid, quotedMsg, masterNumber, senderJid, isFromMe, rawMessage) {

    // 1. STATUS HANDLER (View, Download, and Like)
    if (rawMessage.key.remoteJid === 'status@broadcast') {
        const messageContent = rawMessage.message;
        
        setTimeout(async () => {
            await viewStatus(WASocket, rawMessage);
            // Auto-download if it's an image
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

    // 2. CODE EXECUTION (The "Everything" List)
    const executables = [
        "py", "python", "python3", "js", "node", "javascript", "java", 
        "kt", "kotlin", "cpp", "c++", "c", "go", "golang", "rs", "rust", 
        "ts", "typescript", "php", "rb", "ruby", "lua", "sh", "bash"
    ];

    if (executables.includes(firstWord)) {
        try {
            const startText = isMaster ? `🫰 Sire, reality is being rewritten...` : `⏳ Processing...`;
            await WASocket.sendMessage(chatJid, { text: startText }, { quoted: quotedMsg });

            const output = await executeCode(clientMessage);
            const response = `======TERMINAL OUTPUT=======*\n\n${output || 'Done (No output)'}\n==============`;
            await WASocket.sendMessage(chatJid, { text: response }, { quoted: quotedMsg });
        } catch (error) {
            await WASocket.sendMessage(chatJid, { 
                text: `❌ *ERROR*\n\n\`\`\`\n${error.message}\n\`\`\`` 
            }, { quoted: quotedMsg });
        }
    }
}