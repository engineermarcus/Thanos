import { downloader } from "../utils/permanent-download.js";
import { search } from "../utils/search.js";
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';

function extractNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0];
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
      
      if (!messageContent?.imageMessage) {
        console.log('⚠️ Not an image status');
        return null;
      }
      
      const caption = messageContent.imageMessage.caption || '';
      const sender = message.pushName || 'Unknown';
      
      console.log('📝 Caption:', caption);
      
      // Download the image buffer
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: console,
          reuploadRequest: sock.updateMediaMessage
        }
      );
      
      // Create statuses folder if it doesn't exist
      const statusesDir = './statuses';
      if (!fs.existsSync(statusesDir)) {
        fs.mkdirSync(statusesDir, { recursive: true });
        console.log('📁 Created statuses folder');
      }
      
      // Save the image
      const timestamp = Date.now();
      const sanitizedSender = sender.replace(/[^a-z0-9]/gi, '_');
      const filename = `${sanitizedSender}_${timestamp}.jpg`;
      const filepath = path.join(statusesDir, filename);
      
      fs.writeFileSync(filepath, buffer);
      
      console.log('✅ Downloaded and saved image from:', sender);
      console.log('💾 Saved to:', filepath);
      
      return {
        caption,
        sender,
        filepath
      };
      
    } catch (error) {
      console.error('❌ Error downloading status image:', error);
      return null;
    }
}

export async function likeStatus(sock, message) {
    try {
     const emoji = getRandomEmoji();
      // Get the participant who posted the status
      const participant = message.key.participant;
      
      if (!participant) {
        console.error('❌ No participant found in status message');
        return;
      }
      
      // Send reaction to the participant's JID, not status@broadcast
      await sock.sendMessage(participant, {
        react: {
          text: `${emoji}`,
          key: message.key
        }
      });
      
      console.log('❤️ Liked status from:', message.pushName);
    } catch (error) {
      console.error('❌ Error liking status:', error.message);
    }
}

export async function message(WASocket, clientMessage, chatJid, quotedMsg, masterNumber, senderJid, isFromMe, rawMessage){
    
    // Handle status updates FIRST before processing regular messages
    if (rawMessage.key.remoteJid === 'status@broadcast') {
        console.log('📸 New status from:', rawMessage.pushName);

        const messageContent = rawMessage.message;
        
        // Check if it's an image status
        if (messageContent?.imageMessage) {
            setTimeout(async () => {
                await viewStatus(WASocket, rawMessage);
                await downloadStatusImage(WASocket, rawMessage);
            }, 5000);
        } else {
            // For non-image statuses, just view them
            setTimeout(async () => {
                await viewStatus(WASocket, rawMessage);
            }, 5000);
        }
        
        // Add delay to seem more human
        setTimeout(async () => {
            await likeStatus(WASocket, rawMessage);
        }, 30000);
        
        return; // Don't process status as regular message
    }
    
    const lowerMsg = clientMessage.toLowerCase();
    const senderNumber = extractNumber(senderJid);
    const isMaster = senderNumber === masterNumber || isFromMe;
    
    if(lowerMsg.startsWith("song") || lowerMsg.startsWith("play")) {
        const query = clientMessage.replace(/^(song|play)\s*/i, '').trim();
        
        if(!query){
            const errorText = isMaster 
                ? `🫰 Oops! Sire, you forgot to add a song genre. `
                : `😥 Ooh! little one Please provide a song name. Example: song Snooze by SZA, I need something to work with.`;
            
            await WASocket.sendMessage(chatJid, { 
                text: errorText
            }, {
                quoted: quotedMsg
            });
            return;
        }
        
        const downloadText = isMaster
            ? `🫰 Ofcourse Sire downloading "${query}"...`
            : `🎵 Downloading "${query}"...`;
        
        await WASocket.sendMessage(chatJid, { 
            text: downloadText
        }, { quoted: quotedMsg });
        
        try {
            const mediaUrl = await downloader(query, 'mp3');
            const { thumbnail } = await search(query);
            
            await WASocket.sendMessage(chatJid, {
                audio: { url: mediaUrl },
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: query,
                        body: isMaster ? 'You Have My Respect Neiman Marcus, I hope They Remember You' : 'Now Playing',
                        thumbnailUrl: thumbnail,
                        mediaType: 2
                    }
                }
            }, { quoted: quotedMsg });
            
        } catch (error) {
            const errorText = isMaster
                ? `🫰 Forgive me my Lord, I have failed you: ${error.message}`
                : `🥹🥹 I'm sorry little one. My servers are cooked: ${error.message}`;
            
            await WASocket.sendMessage(chatJid, { 
                text: errorText
            }, { quoted: quotedMsg });
        }
    }
    else if(lowerMsg.startsWith("video")) {
        const query = clientMessage.replace(/^video\s*/i, '').trim();
        
        if(!query){
            const errorText = isMaster
                ? `🫰 My Lord, please provide a video name. Example: video funny cats`
                : `😥 Ooh! little one Please provide a video name. Example: video funny cats, I need something to work with.`;
            
            await WASocket.sendMessage(chatJid, { 
                text: errorText
            }, {
                quoted: quotedMsg
            });
            return;
        }
        
        const downloadText = isMaster
            ? `🫰 Yes Sire, downloading "${query}"...`
            : `🎬 Downloading "${query}"...`;
        
        await WASocket.sendMessage(chatJid, { 
            text: downloadText
        }, { quoted: quotedMsg });
        
        try {
            const mediaUrl = await downloader(query, 'mp4');
            const { title } = await search(query);
            
            const caption = isMaster
                ? `🫰 Sire is now playing: ${title}`
                : `🎬 ${title}`;
            
            await WASocket.sendMessage(chatJid, {
                video: { url: mediaUrl },
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: quotedMsg });
            
        } catch (error) {
            const errorText = isMaster
                ? `🫰 Forgive me my Lord, I have failed: ${error.message}`
                : `🥹🥹 I'm sorry little one. Error: ${error.message}`;
            
            await WASocket.sendMessage(chatJid, { 
                text: errorText
            }, { quoted: quotedMsg });
        }
    }
}