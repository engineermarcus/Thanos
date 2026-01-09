export async function deleteMessage(sock, msg) {
  try {
    if (!sock || !msg || !msg.key) {
      console.error('❌ Invalid parameters for deleteMessage');
      return false;
    }

    await sock.sendMessage(msg.key.remoteJid, {
      delete: msg.key
    });

    console.log('🗑️  Message deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting message:', error.message);
    return false;
  }
}

export async function deleteMessageByKey(sock, chatId, messageId, fromMe = false, participant = null) {
  try {
    if (!sock || !chatId || !messageId) {
      console.error('❌ Invalid parameters for deleteMessageByKey');
      return false;
    }

    const key = {
      remoteJid: chatId,
      id: messageId,
      fromMe: fromMe
    };

    if (participant && chatId.endsWith('@g.us')) {
      key.participant = participant;
    }

    await sock.sendMessage(chatId, {
      delete: key
    });

    console.log('🗑️  Message deleted by key successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting message by key:', error.message);
    return false;
  }
}

export async function deleteBotMessage(sock, chatId, sentMessage) {
  try {
    if (!sock || !chatId || !sentMessage || !sentMessage.key) {
      console.error('❌ Invalid parameters for deleteBotMessage');
      return false;
    }

    await sock.sendMessage(chatId, {
      delete: sentMessage.key
    });

    console.log('🗑️  Bot message deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error deleting bot message:', error.message);
    return false;
  }
}

export async function deleteMessageAfterDelay(sock, chatId, sentMessage, delayMs = 5000) {
  try {
    if (!sock || !chatId || !sentMessage) {
      console.error('❌ Invalid parameters for deleteMessageAfterDelay');
      return false;
    }

    console.log(`⏳ Message will be deleted in ${delayMs / 1000} seconds`);

    setTimeout(async () => {
      await deleteBotMessage(sock, chatId, sentMessage);
    }, delayMs);

    return true;
  } catch (error) {
    console.error('❌ Error scheduling message deletion:', error.message);
    return false;
  }
}

export async function deleteMultipleMessages(sock, chatId, messages, delayBetween = 500) {
  const results = {
    success: 0,
    failed: 0,
    total: messages.length
  };

  try {
    for (const msg of messages) {
      const success = await deleteMessage(sock, msg);
      
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }

      if (delayBetween > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetween));
      }
    }

    console.log(`🗑️  Deleted ${results.success}/${results.total} messages`);
    return results;
  } catch (error) {
    console.error('❌ Error in deleteMultipleMessages:', error.message);
    return results;
  }
}

export async function canDeleteMessage(sock, chatId, msg) {
  try {
    if (msg.key.fromMe) {
      return true;
    }

    if (!chatId.endsWith('@g.us')) {
      return false;
    }

    const groupMetadata = await sock.groupMetadata(chatId);
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    
    const botParticipant = groupMetadata.participants.find(
      p => p.id === botNumber
    );

    return botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
  } catch (error) {
    console.error('❌ Error checking delete permissions:', error.message);
    return false;
  }
}

const mutedUsers = new Map();
const permanentlyMuted = new Set();
const linkViolations = new Map();
const messageTimestamps = new Map();
const editHistory = new Map();
const botSuspects = new Set();

const LINK_PATTERNS = [
    /https?:\/\/[^\s]+/gi,
    /www\.[^\s]+/gi,
    /[a-zA-Z0-9-]+\.(com|net|org|io|co|app|xyz|me|info|biz|tv|online|site|tech|store|shop|live|club|fun|gg|cc)[^\s]*/gi,
    /t\.me\/[^\s]+/gi,
    /wa\.me\/[^\s]+/gi,
    /chat\.whatsapp\.com\/[^\s]+/gi,
    /whatsapp\.com\/channel\/[^\s]+/gi,
    /wa\.link\/[^\s]+/gi,
    /api\.whatsapp\.com\/[^\s]+/gi,
    /web\.whatsapp\.com\/[^\s]+/gi,
    /whatsapp:\/\/[^\s]+/gi,
    /bit\.ly\/[^\s]+/gi,
    /tinyurl\.com\/[^\s]+/gi,
    /cutt\.ly\/[^\s]+/gi,
    /shorturl\.at\/[^\s]+/gi,
    /s\.id\/[^\s]+/gi
];

async function isAdmin(sock, chatId, userId) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const participant = groupMetadata.participants.find(p => p.id === userId);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch (error) {
        return false;
    }
}

function containsLink(text) {
    if (!text) return false;
    return LINK_PATTERNS.some(pattern => pattern.test(text));
}

function detectRapidReplies(userId) {
    const now = Date.now();
    const timestamps = messageTimestamps.get(userId) || [];
    
    timestamps.push(now);
    if (timestamps.length > 10) timestamps.shift();
    messageTimestamps.set(userId, timestamps);
    
    if (timestamps.length >= 5) {
        const recentMessages = timestamps.slice(-5);
        const timeSpan = recentMessages[4] - recentMessages[0];
        
        if (timeSpan < 3000) {
            console.log(`🤖 BOT DETECTED (rapid replies): ${userId.split('@')[0]}`);
            return true;
        }
    }
    return false;
}

function detectRapidEditing(messageId) {
    const now = Date.now();
    const edits = editHistory.get(messageId) || [];
    
    edits.push(now);
    editHistory.set(messageId, edits);
    
    if (edits.length >= 3) {
        const timeSpan = edits[edits.length - 1] - edits[0];
        if (timeSpan < 2000) {
            console.log(`🤖 BOT DETECTED (rapid editing): ${edits.length} edits in ${timeSpan}ms`);
            return true;
        }
    }
    return false;
}

async function silentDelete(sock, chatId, messageId, senderId) {
    try {
        await sock.sendMessage(chatId, {
            delete: {
                remoteJid: chatId,
                fromMe: false,
                id: messageId,
                participant: senderId
            }
        });
        return true;
    } catch (error) {
        return false;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scanAndDeleteSpam(sock, chatId, botOwnerNumber, options = {}) {
    const {
        maxChars = 160,
        muteDuration = 10 * 60 * 1000,
        batchSize = 50
    } = options;

    console.log(`🔍 Starting spam scan for chat: ${chatId}`);

    const results = {
        totalScanned: 0,
        spamFound: 0,
        messagesDeleted: 0,
        usersMuted: 0,
        spammers: [],
        errors: 0
    };

    try {
        let allMessages = [];
        let lastMessageId = null;
        let hasMore = true;

        while (hasMore) {
            try {
                const messages = await sock.fetchMessagesFromWA(
                    chatId, 
                    batchSize, 
                    lastMessageId ? { before: lastMessageId } : undefined
                );

                if (!messages || messages.length === 0) {
                    hasMore = false;
                    break;
                }

                allMessages = allMessages.concat(messages);
                lastMessageId = messages[messages.length - 1].key.id;
                console.log(`📥 Fetched ${messages.length} messages (Total: ${allMessages.length})`);

                if (messages.length < batchSize) hasMore = false;

            } catch (fetchError) {
                console.log('⚠️ Could not fetch more messages');
                hasMore = false;
            }
        }

        console.log(`✅ Total messages fetched: ${allMessages.length}`);
        results.totalScanned = allMessages.length;

        for (const msg of allMessages) {
            try {
                if (!msg.message) continue;

                const senderId = msg.key.participant || msg.key.remoteJid;
                const senderNumber = senderId.split('@')[0];
                const isFromMe = msg.key.fromMe;
                const messageId = msg.key.id;

                if (senderNumber === botOwnerNumber.split('@')[0] || isFromMe) continue;

                const userIsAdmin = await isAdmin(sock, chatId, senderId);
                if (userIsAdmin) {
                    console.log(`👑 Skipping admin: ${senderNumber}`);
                    continue;
                }

                let messageText = '';
                if (msg.message?.conversation) {
                    messageText = msg.message.conversation;
                } else if (msg.message?.extendedTextMessage) {
                    messageText = msg.message.extendedTextMessage.text;
                } else if (msg.message?.imageMessage) {
                    messageText = msg.message.imageMessage.caption || '';
                } else if (msg.message?.videoMessage) {
                    messageText = msg.message.videoMessage.caption || '';
                }

                if (messageText.length > maxChars) {
                    console.log(`🚨 SPAM FOUND: ${senderNumber} - ${messageText.length} chars`);
                    results.spamFound++;

                    try {
                        await sock.sendMessage(chatId, {
                            delete: {
                                remoteJid: chatId,
                                fromMe: false,
                                id: messageId,
                                participant: senderId
                            }
                        });

                        results.messagesDeleted++;
                        console.log(`🗑️ Deleted spam: ${messageId}`);
                        await sleep(500);

                    } catch (deleteError) {
                        results.errors++;
                    }

                    if (!mutedUsers.has(senderId)) {
                        const mutedUntil = Date.now() + muteDuration;
                        mutedUsers.set(senderId, {
                            mutedUntil: mutedUntil,
                            messageCount: 1,
                            mutedAt: Date.now(),
                            spamCharCount: messageText.length
                        });

                        results.usersMuted++;
                        results.spammers.push({
                            number: senderNumber,
                            spamLength: messageText.length,
                            mutedUntil: new Date(mutedUntil).toLocaleString()
                        });

                        console.log(`🔇 MUTED: ${senderNumber}`);
                    }
                }

            } catch (msgError) {
                results.errors++;
            }
        }

        let report = '🛡️ *SPAM SCAN COMPLETE*\n\n';
        report += `📊 Messages Scanned: ${results.totalScanned}\n`;
        report += `🚨 Spam Found: ${results.spamFound}\n`;
        report += `🗑️ Messages Deleted: ${results.messagesDeleted}\n`;
        report += `🔇 Users Muted: ${results.usersMuted}\n`;
        report += `❌ Errors: ${results.errors}\n\n`;

        if (results.spammers.length > 0) {
            report += '*Muted Users:*\n';
            results.spammers.forEach((spammer, i) => {
                report += `${i + 1}. ${spammer.number} (${spammer.spamLength} chars)\n`;
            });
        }

        await sock.sendMessage(chatId, { text: report });
        return results;

    } catch (error) {
        console.error('❌ Error in spam scanner:', error);
        return { ...results, error: error.message };
    }
}

export async function realtimeSpamControl(sock, msg, botOwnerNumber, options = {}) {
    const {
        maxChars = 160,
        muteDuration = 10 * 60 * 1000,
        adminLinkLimit = 2,
        enableBotDetection = true
    } = options;

    try {
        const chatId = msg.key.remoteJid;
        const senderId = msg.key.participant || msg.key.remoteJid;
        const senderNumber = senderId.split('@')[0];
        const isFromMe = msg.key.fromMe;
        const messageId = msg.key.id;
        const isGroupChat = chatId.endsWith('@g.us');

        if (senderNumber === botOwnerNumber.split('@')[0] || isFromMe) {
            return { action: 'ignored', reason: 'owner' };
        }

        if (isGroupChat) {
            const userIsAdmin = await isAdmin(sock, chatId, senderId);
            if (userIsAdmin) {
                console.log(`👑 Admin exempt from rules: ${senderNumber}`);
                return { action: 'ignored', reason: 'admin' };
            }
        }

        if (permanentlyMuted.has(senderId)) {
            await silentDelete(sock, chatId, messageId, senderId);
            console.log(`🔇 Permanently muted user deleted: ${senderNumber}`);
            return { action: 'deleted', reason: 'permanently_muted' };
        }

        if (enableBotDetection) {
            const isRapidBot = detectRapidReplies(senderId);
            let isEditBot = false;
            
            if (msg.message?.protocolMessage?.type === 14) {
                isEditBot = detectRapidEditing(messageId);
            }

            if (isRapidBot || isEditBot) {
                botSuspects.add(senderId);
                permanentlyMuted.add(senderId);
                await silentDelete(sock, chatId, messageId, senderId);
                
                console.log(`🤖 BOT PERMANENTLY MUTED: ${senderNumber}`);
                return { action: 'bot_detected', permanentlyMuted: true };
            }
        }

        if (mutedUsers.has(senderId)) {
            const muteInfo = mutedUsers.get(senderId);
            
            if (Date.now() >= muteInfo.mutedUntil) {
                mutedUsers.delete(senderId);
                console.log(`🔓 Unmuted: ${senderNumber}`);
            } else {
                await silentDelete(sock, chatId, messageId, senderId);
                const remainingTime = Math.ceil((muteInfo.mutedUntil - Date.now()) / 1000 / 60);
                console.log(`🔇 Deleted from muted user: ${senderNumber} (${remainingTime}min left)`);
                muteInfo.messageCount++;
                return { action: 'deleted', reason: 'user_muted', remainingTime };
            }
        }

        let messageText = '';
        if (msg.message?.conversation) {
            messageText = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage) {
            messageText = msg.message.extendedTextMessage.text;
        } else if (msg.message?.imageMessage) {
            messageText = msg.message.imageMessage.caption || '';
        } else if (msg.message?.videoMessage) {
            messageText = msg.message.videoMessage.caption || '';
        }

        if (isGroupChat && containsLink(messageText)) {
            console.log(`🔗 LINK DETECTED: ${senderNumber}`);

            const violations = linkViolations.get(senderId) || { count: 0, warnings: 0 };
            violations.count++;
            violations.warnings++;
            linkViolations.set(senderId, violations);

            await silentDelete(sock, chatId, messageId, senderId);
            
            console.log(`⚠️ Link deleted: ${senderNumber}`);

            if (violations.warnings >= 3) {
                permanentlyMuted.add(senderId);
                await sock.sendMessage(chatId, {
                    text: `🔇 @${senderNumber} permanently muted for repeated link violations.`,
                    mentions: [senderId]
                });
                console.log(`🔇 PERMANENTLY MUTED: ${senderNumber}`);
            }

            return { action: 'link_deleted', warnings: violations.warnings };
        }

        if (messageText.length > maxChars) {
            console.log(`🚨 NEW SPAM: ${senderNumber} - ${messageText.length} chars`);

            await silentDelete(sock, chatId, messageId, senderId);

            const mutedUntil = Date.now() + muteDuration;
            mutedUsers.set(senderId, {
                mutedUntil: mutedUntil,
                messageCount: 1,
                mutedAt: Date.now()
            });

            console.log(`🔇 MUTED: ${senderNumber} for 10 minutes`);

            return { action: 'spam_detected', charCount: messageText.length, muted: true };
        }

        return { action: 'allowed', charCount: messageText.length };

    } catch (error) {
        console.error('❌ Realtime control error:', error);
        return { action: 'error', error: error.message };
    }
}

export function getMutedUsers() {
    const now = Date.now();
    const muted = [];
    
    for (const [userId, info] of mutedUsers.entries()) {
        if (now < info.mutedUntil) {
            muted.push({
                userId: userId.split('@')[0],
                remainingMinutes: Math.ceil((info.mutedUntil - now) / 1000 / 60),
                deletedMessages: info.messageCount
            });
        } else {
            mutedUsers.delete(userId);
        }
    }
    
    return muted;
}

export function getDetectionStats() {
    return {
        permanentlyMutedCount: permanentlyMuted.size,
        permanentlyMutedUsers: Array.from(permanentlyMuted).map(id => id.split('@')[0]),
        botSuspectsCount: botSuspects.size,
        botSuspects: Array.from(botSuspects).map(id => id.split('@')[0]),
        totalViolations: linkViolations.size
    };
}

export function unbanUser(userId) {
    const fullId = userId.includes('@') ? userId : userId + '@s.whatsapp.net';
    
    if (permanentlyMuted.has(fullId)) {
        permanentlyMuted.delete(fullId);
        linkViolations.delete(fullId);
        botSuspects.delete(fullId);
        console.log(`🔓 Unbanned: ${userId}`);
        return true;
    }
    return false;
}

export function isBanned(userId) {
    const fullId = userId.includes('@') ? userId : userId + '@s.whatsapp.net';
    return permanentlyMuted.has(fullId);
}

export default {
  deleteMessage,
  deleteMessageByKey,
  deleteBotMessage,
  deleteMessageAfterDelay,
  deleteMultipleMessages,
  canDeleteMessage
};