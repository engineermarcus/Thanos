import { sendMessageToThanos } from './Thanos/thanos.js';
import { getHistory, addMessage } from './history.js';

let botStartTime = Date.now();
let botMessageTracker = null;
let socketInstance = null;

export function setBotStartTime() {
    botStartTime = Date.now();
}

export function setBotMessageTracker(tracker) {
    botMessageTracker = tracker;
}

export function setSocketInstance(sock) {
    socketInstance = sock;
}

function trackBotMessage(messageId) {
    if (botMessageTracker && messageId) {
        botMessageTracker.add(messageId);
        console.log('✅ Tracked bot message:', messageId);
        setTimeout(() => {
            botMessageTracker.delete(messageId);
        }, 60000);
    }
}

async function getContextInfo(chatId, senderJid) {
    const isGroup = chatId.endsWith('@g.us');
    
    if (isGroup) {
        try {
            const groupMetadata = await socketInstance.groupMetadata(chatId);
            return {
                chatType: 'group',
                chatName: groupMetadata.subject || 'Unknown Group'
            };
        } catch (error) {
            console.error('Error fetching group metadata:', error);
            return {
                chatType: 'group',
                chatName: 'Unknown Group'
            };
        }
    } else {
        const phoneNumber = senderJid.split('@')[0].split(':')[0];
        try {
            const contact = await socketInstance.onWhatsApp(phoneNumber);
            const name = contact?.[0]?.notify || contact?.[0]?.name || 'Unknown User';
            return {
                chatType: 'private',
                chatName: name
            };
        } catch (error) {
            return {
                chatType: 'private',
                chatName: 'Unknown User'
            };
        }
    }
}


export async function sendText(WASocket, msg, senderNumber, quotedMsg){
    const message = msg.toLowerCase() === 'ping'? 'pong 🏓': null;
    
    if (message) {
        const sentMsg = await WASocket.sendMessage(senderNumber, { 
            text: message
        }, {
            quoted: quotedMsg
        });
        
        if (sentMsg && sentMsg.key && sentMsg.key.id) {
            trackBotMessage(sentMsg.key.id);
        }
        
        return sentMsg;
    }
    return null;
}

export async function editText(WASocket, newText, senderNumber, messageToEdit){
    if (newText && messageToEdit) {
        await WASocket.sendMessage(senderNumber, { 
            text: newText,
            edit: messageToEdit.key
        });
    }
}

export async function sendThanosMessage(WASocket, userMessage, senderNumber, quotedMsg, originalMsg) {
    console.log('📤 sendThanosMessage called with:', {
        senderNumber,
        userMessage: userMessage.substring(0, 30),
        isGroup: senderNumber.endsWith('@g.us'),
        hasQuotedMsg: !!quotedMsg
    });

    try {
        const sentMsg = await WASocket.sendMessage(senderNumber, { 
            text: `typing....`
        }, quotedMsg ? { quoted: quotedMsg } : {});
        
        if (sentMsg && sentMsg.key && sentMsg.key.id) {
            trackBotMessage(sentMsg.key.id);
        }
        
        console.log('✅ Initial "typing..." message sent');

        console.log('🤖 Getting Thanos response...');
        
        const senderJid = originalMsg.key.participant || originalMsg.key.remoteJid;
        const contextInfo = await getContextInfo(senderNumber, senderJid);
        
        const history = await getHistory(senderNumber, 10);
        
        const contextualMessage = contextInfo.chatType === 'group' 
            ? `[GROUP: ${contextInfo.chatName}] ${userMessage}`
            : `[PRIVATE: ${contextInfo.chatName}] ${userMessage}`;
        
        console.log('📍 Context:', contextInfo);
        
        const response = await sendMessageToThanos(contextualMessage, history, originalMsg);
        
        await addMessage(senderNumber, 'user', userMessage);
        await addMessage(senderNumber, 'assistant', response);
        
        await editText(WASocket, response, senderNumber, sentMsg);
        
        console.log(`✅ Thanos responded: ${response.length} chars`);
        console.log('📨 Response sent to:', senderNumber);
        return sentMsg;
        
    } catch (error) {
        console.error('❌ Thanos error:', error);
        console.error('❌ Error stack:', error.stack);
        
        try {
            await WASocket.sendMessage(senderNumber, {
                text: '❌ _Thanos is unavailable. Reality stone malfunctioning..._'
            });
        } catch (sendError) {
            console.error('❌ Could not send error message:', sendError);
        }
        return null;
    }
}

export async function animatePong(WASocket, senderNumber, sentMessage) {
    // Just keep the simple pong response - no animation needed
    // The initial "pong 🏓" message stays as is
}

