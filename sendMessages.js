import { downloader } from "./utils/permanent-download.js";
import { search } from "./utils/search.js";

function extractNumber(jid) {
    if (!jid) return '';
    return jid.split('@')[0].split(':')[0];
}

export async function message(WASocket, clientMessage, chatJid, quotedMsg, masterNumber, senderJid,isFromMe){
    const lowerMsg = clientMessage.toLowerCase();
    const senderNumber = extractNumber(senderJid);
    const isMaster = senderNumber === masterNumber  || isFromMe;
    
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
            const { thumbnail,title } = await search(query);
            
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