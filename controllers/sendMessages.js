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

export async function likeStatus(sock, message) {
    try {
      const emoji = getRandomEmoji();
      const participant = message.key.participant;
      if (!participant) return;
      await sock.sendMessage(participant, { react: { text: emoji, key: message.key } });
      console.log('❤️ Liked status from:', message.pushName);
    } catch (error) {
      console.error('❌ Error liking status:', error.message);
    }
}

export async function message(WASocket, clientMessage, chatJid, quotedMsg, masterNumber, senderJid, isFromMe, rawMessage){
    
    // 1. STATUS HANDLER (Auto-view and Auto-like)
    if (rawMessage.key.remoteJid === 'status@broadcast') {
        setTimeout(async () => await viewStatus(WASocket, rawMessage), 5000);
        setTimeout(async () => await likeStatus(WASocket, rawMessage), 30000);
        return;
    }
    
    const lowerMsg = clientMessage.trim().toLowerCase();
    const parts = lowerMsg.split(/\s+/);
    const firstWord = parts[0];
    
    const senderNumber = extractNumber(senderJid);
    const isMaster = senderNumber === masterNumber || isFromMe;

    // 2. CODE EXECUTION TRIGGER (Full List of Executables)
    const executables = [
        // Python & Data Science
        "py", "python", "python3", "r", "julia", "jl",
        // JavaScript / Web
        "js", "node", "javascript", "ts", "typescript", "coffee", "coffeescript",
        // Shell & Scripts
        "sh", "bash", "zsh", "ps1", "powershell", "lua", "pl", "perl", "awk",
        // Systems & C-Family
        "c", "cpp", "c++", "cs", "csharp", "rs", "rust", "go", "golang", "zig", "nim", "d",
        // JVM & Android
        "java", "kt", "kotlin", "scala", "groovy", "clj", "clojure",
        // Functional
        "hs", "haskell", "ex", "elixir", "erl", "erlang", "ml", "ocaml", "fs", "fsharp",
        // Mobile & Other
        "swift", "dart", "rb", "ruby", "php", "sql", "m", "matlab", "pas", "pascal", "v", "vlang", "fortran", "f90"
    ];
    
    if (executables.includes(firstWord)) {
        try {
            // Give Master a personalized response
            const startText = isMaster 
                ? `Executing ${firstWord} code *BOSS*...` 
                : `⏳ Processing ${firstWord} code... Stand by.`;
            
         //   await WASocket.sendMessage(chatJid, { text: startText }, { quoted: quotedMsg });

            // Pass the raw clientMessage to executeCode to preserve indents/newlines
            const output = await executeCode(clientMessage);
            
            // Return formatted result or error notice
            const response = `*=====TERMINAL OUTPUT=====*\n\n\n${output || '===============\n\nExited with (code 0)\n\n=================='}`;
            await WASocket.sendMessage(chatJid, { text: response }, { quoted: quotedMsg });

        } catch (error) {
            // Inform about the specific crash/syntax error
            await WASocket.sendMessage(chatJid, { 
                text: `❌ *EXECUTION FAILED*\n\n\`\`\`\n${error.message}\n\`\`\`` 
            }, { quoted: quotedMsg });
        }
        return;
    }

    // Everything else (song, play, video) is now ignored.
}