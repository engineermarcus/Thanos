import { sendThanosMessage } from '../index.js'

function extractNumber(jid) {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0];
}

function isSameUser(jid1, jid2) {
  if (!jid1 || !jid2) return false;
  const num1 = extractNumber(jid1);
  const num2 = extractNumber(jid2);
  return num1 === num2;
}

function isBotJid(jid, BOT_JIDS) {
  if (!jid || !BOT_JIDS || BOT_JIDS.length === 0) return false;
  for (const botJid of BOT_JIDS) {
    if (isSameUser(jid, botJid) || jid === botJid) {
      return true;
    }
  }
  return false;
}
export async function privateChat(msg, WASocket, userMessage, BOT_JIDS = [], skipGroupCheck = false) {
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    
    if (msg.key.fromMe || isBotJid(senderJid, BOT_JIDS)) {
        console.log('⏭️ privateChat: Skipping bot\'s own message');
        return;
    }
    
    const isPrivate = !from?.endsWith('@g.us') && 
                      !from?.endsWith('@newsletter') && 
                      from !== 'status@broadcast';
    
    if (isPrivate) {
        console.log('💬 Private chat - responding');
        await sendThanosMessage(WASocket, userMessage, from, msg, msg);
        return;
    }
    
    if (skipGroupCheck) {
        console.log('💬 Group chat - already validated - responding');
        await sendThanosMessage(WASocket, userMessage, from, msg, msg);
        return;
    }
    
    const quotedMessage = msg.message?.extendedTextMessage?.contextInfo;
    let isReplyToBot = false;
    
    if (quotedMessage && quotedMessage.participant) {
        const quotedParticipant = quotedMessage.participant;
        console.log('🔍 Checking if reply to bot:', {
            quotedParticipant,
            BOT_JIDS
        });
        isReplyToBot = isBotJid(quotedParticipant, BOT_JIDS);
        if (isReplyToBot) {
            console.log('✅ Reply to bot confirmed');
        }
    }
    
    if (isReplyToBot) {
        console.log('💬 Group chat - replying');
        await sendThanosMessage(WASocket, userMessage, from, msg, msg);
    } else {
        console.log('⏭️ Group message not replying to bot - ignoring');
    }
}