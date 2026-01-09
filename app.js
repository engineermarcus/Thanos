import 'dotenv/config';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  Browsers
} from '@whiskeysockets/baileys';
import { MongoClient } from 'mongodb';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pino from 'pino';
import qrcode from 'qrcode';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';
import { sendText, editText, animatePong, setBotStartTime, sendThanosMessage, setBotMessageTracker, setSocketInstance } from './index.js';
  
import { 
  settings,
  getThanosStatus,
  setThanosStatus,
  getGroupControlStatus,
  setGroupControlStatus
} from './settings.js'; 

import { checkBotStatus } from './controllers/global.js';
import { privateChat } from './controllers/private.js'; 
import { initMongoDB as initHistoryDB } from './history.js';
import { 
  deleteMessage, 
  deleteBotMessage,
  deleteMessageAfterDelay, 
  canDeleteMessage,
  scanAndDeleteSpam, 
  realtimeSpamControl, 
  getMutedUsers,
  getDetectionStats,
  unbanUser,
  isBanned
} from './controllers/group.js';
import { getMenuText } from './menu.js';

const { dbName } = settings();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = dbName;
const SESSIONS_COLLECTION = 'sessions';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const logger = pino({ level: 'silent' });

let mongoClient;
let sessionsCollection;
let sock;
let qrCode = null;
let pairingCode = null;
let ACTUAL_BOT_NUMBER = null;

const botMessageIds = new Set();

// ============= ZERO DOWNTIME ADDITIONS START =============
let lastSuccessfulSync = Date.now();
let isShuttingDown = false;

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

function isBotNumber(jid) {
  if (!jid || !ACTUAL_BOT_NUMBER) return false;
  return extractNumber(jid) === ACTUAL_BOT_NUMBER;
}

function getReplyJid(remoteJid) {
  if (!remoteJid) return null;
  if (remoteJid.includes('@lid')) {
    return remoteJid;
  }
  return extractNumber(remoteJid);
}

async function initMongoDB() {
  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB Atlas');
    const db = mongoClient.db(DB_NAME);
    sessionsCollection = db.collection(SESSIONS_COLLECTION);
    await sessionsCollection.createIndex({ _id: 1 });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

const AUTH_DIR = './auth_session';

async function syncAuthToMongo() {
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const files = fs.readdirSync(AUTH_DIR);
    
    // Use Promise.all for faster parallel syncing
    const syncPromises = files.map(async (file) => {
      const filePath = path.join(AUTH_DIR, file);
      if (!fs.existsSync(filePath)) return;
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        await sessionsCollection.updateOne(
          { _id: file },
          { $set: { data: content, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (fileError) {
        console.log(`⚠️ Skipping file ${file}`);
      }
    });
    
    await Promise.all(syncPromises);
    lastSuccessfulSync = Date.now();
    console.log('✅ Auth synced to MongoDB');
  } catch (error) {
    console.error('Error syncing to MongoDB:', error.message);
    throw error;
  }
}

async function loadAuthFromMongo() {
  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    
    const docs = await sessionsCollection.find({}).toArray();
    if (docs.length === 0) {
      console.log('📝 No existing session found');
      return false;
    }
    
    let loadedCount = 0;
    const criticalFiles = ['creds.json'];
    
    // Load critical files first
    for (const doc of docs) {
      if (criticalFiles.includes(doc._id)) {
        try {
          const filePath = path.join(AUTH_DIR, doc._id);
          fs.writeFileSync(filePath, doc.data);
          loadedCount++;
        } catch (fileError) {
          console.error(`❌ Failed to load critical file ${doc._id}:`, fileError);
          throw fileError;
        }
      }
    }
    
    // Load remaining files
    for (const doc of docs) {
      if (!criticalFiles.includes(doc._id)) {
        try {
          const filePath = path.join(AUTH_DIR, doc._id);
          fs.writeFileSync(filePath, doc.data);
          loadedCount++;
        } catch (fileError) {
          console.log(`⚠️ Error loading ${doc._id}`);
        }
      }
    }
    
    console.log(`📥 Session loaded (${loadedCount} files)`);
    return true;
  } catch (error) {
    console.error('Error loading from MongoDB:', error.message);
    return false;
  }
}

async function startWhatsAppBot(usePairingCode = false, phoneNumber = null) {
  try {
    await loadAuthFromMongo();
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.macOS('Chrome'),
      markOnlineOnConnect: false,
      getMessage: async () => undefined,
      syncFullHistory: false,
      shouldIgnoreJid: () => false
    });

    if (usePairingCode && phoneNumber && !sock.authState.creds.registered) {
      console.log('📱 Requesting pairing code for:', phoneNumber);
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber);
          pairingCode = code;
          console.log('🔢 Pairing Code:', code);
          io.emit('pairing-code', code);
        } catch (error) {
          console.error('❌ Error generating pairing code:', error);
          io.emit('pairing-code-error', error.message);
        }
      }, 3000);
    }

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && !usePairingCode) {
        qrCode = qr;
        const qrDataUrl = await qrcode.toDataURL(qr);
        io.emit('qr', qrDataUrl);
        console.log('📱 QR Code generated');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect) {
          setTimeout(() => startWhatsAppBot(), 5000);
        } else {
          qrCode = null;
          pairingCode = null;
          io.emit('logged-out');
          if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          }
          await sessionsCollection.deleteMany({});
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp Connected!');
        
        // Immediate sync after connection
        await syncAuthToMongo();
        
        setBotStartTime();
        setBotMessageTracker(botMessageIds);
        setSocketInstance(sock);
        
        if (sock.user) {
          ACTUAL_BOT_NUMBER = extractNumber(sock.user.id);
          
          console.log('📱 Connected as:', sock.user.name || sock.user.id);
          console.log('🤖 Bot Number:', ACTUAL_BOT_NUMBER);
          
          const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
          try {
            await sock.sendMessage(myJid, { 
              text: '✅ THANOS MD BOT ONLINE\n\n⚡ The Mad Titan Awakens\n🫰 Ready to snap commands into action!\n\n💬 GROUP MODE: Human-like chat\n✅ Responds to replies\n✅ Remembers context\n✅ Natural conversations'
            });
          } catch (msgError) {
            console.log('⚠️ Could not send welcome message');
          }
        }
        qrCode = null;
        pairingCode = null;
        io.emit('connected', {
          name: sock.user?.name,
          number: ACTUAL_BOT_NUMBER
        });
      }
    });

    let syncTimeout;
    sock.ev.on('creds.update', async () => {
      await saveCreds();
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(async () => {
        await syncAuthToMongo();
      }, 2000);
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.message.protocolMessage) continue;

        const messageId = msg.key.id;

        if (msg.key.fromMe) {
          botMessageIds.add(messageId);
          console.log('📤 Bot message tracked:', messageId);
          
          setTimeout(() => {
            botMessageIds.delete(messageId);
          }, 60000);
          
          
        }

        const messageData = extractMessageInfo(msg);
        const senderJid = msg.key.participant || msg.key.remoteJid;
        
        if (isBotNumber(senderJid)) {
          console.log('⏭️ Skipping - sender is bot number');
          continue;
        }
        
        console.log('📨 Message received:', {
          chatType: messageData.chatType,
          from: messageData.from,
          sender: extractNumber(senderJid),
          content: messageData.messageContent.substring(0, 50)
        });
        
        const senderNumber = extractNumber(senderJid);
        const isOwner = msg.key.fromMe;

        if (messageData.messageContent.toLowerCase() === 'menu' && isOwner) {
          const menuText = getMenuText(getThanosStatus(), getGroupControlStatus(), getDetectionStats());
          await sock.sendMessage(messageData.replyTo, { text: menuText });
          continue;
        }

        if (messageData.messageContent.toLowerCase() === 'blacklist' && isOwner) {
          const groupControl = getGroupControlStatus();
          if (groupControl !== "yes") {
            await sock.sendMessage(messageData.replyTo, { text: '⚠️ Enable group control first' });
            continue;
          }
          await sock.sendMessage(messageData.replyTo, { text: '🔍 Starting spam scan...' });
          await scanAndDeleteSpam(sock, messageData.from, ACTUAL_BOT_NUMBER + '@s.whatsapp.net', { maxChars: 160 });
          continue;
        }

        if (messageData.messageContent.toLowerCase() === 'banned' && isOwner) {
          const stats = getDetectionStats();
          let response = `🚫 *BANNED USERS*\n\nTotal: ${stats.permanentlyMutedCount}\nBots: ${stats.botSuspectsCount}\n\n`;
          if (stats.permanentlyMutedUsers.length > 0) {
            response += '*List:*\n' + stats.permanentlyMutedUsers.map((u, i) => `${i + 1}. ${u}`).join('\n');
          }
          await sock.sendMessage(messageData.replyTo, { text: response });
          continue;
        }

        if (messageData.messageContent.toLowerCase().startsWith('unban') && isOwner) {
          const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          if (!mentionedJid) {
            await sock.sendMessage(messageData.replyTo, { text: '❌ Mention a user: unban @user' });
            continue;
          }
          const success = unbanUser(mentionedJid);
          await sock.sendMessage(messageData.replyTo, { 
            text: success ? `✅ Unbanned` : `❌ Not banned`,
            mentions: [mentionedJid]
          });
          continue;
        }

        if (messageData.messageContent.toLowerCase().startsWith('checkban') && isOwner) {
          const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          if (!mentionedJid) {
            await sock.sendMessage(messageData.replyTo, { text: '❌ Mention a user: checkban @user' });
            continue;
          }
          const banned = isBanned(mentionedJid);
          await sock.sendMessage(messageData.replyTo, { 
            text: banned ? `🚫 BANNED` : `✅ NOT banned`,
            mentions: [mentionedJid]
          });
          continue;
        }

        if (messageData.messageContent.toLowerCase() === 'muted' && isOwner) {
          const mutedList = getMutedUsers();
          let response = '🔇 *MUTED USERS*\n\n';
          if (mutedList.length === 0) {
            response += 'None';
          } else {
            mutedList.forEach((u, i) => {
              response += `${i + 1}. ${u.userId} (${u.remainingMinutes}min, ${u.deletedMessages} deleted)\n`;
            });
          }
          await sock.sendMessage(messageData.replyTo, { text: response });
          continue;
        }

        if (messageData.messageContent.toLowerCase() === 'groupcontrol on' && isOwner) {
          setGroupControlStatus("yes");
          await sock.sendMessage(messageData.replyTo, { text: "✅ Group Control ENABLED" });
          continue;
        }

        if (messageData.messageContent.toLowerCase() === 'groupcontrol off' && isOwner) {
          setGroupControlStatus("no");
          await sock.sendMessage(messageData.replyTo, { text: "❌ Group Control DISABLED" });
          continue;
        }

        if (messageData.messageContent.toLowerCase() === 'groupstatus' && isOwner) {
          const status = getGroupControlStatus();
          const thanos = getThanosStatus();
          const stats = getDetectionStats();
          let response = `📊 *BOT STATUS*\n\n🤖 Thanos: ${thanos === "yes" ? "✅" : "❌"}\n🛡️ Protection: ${status === "yes" ? "✅" : "❌"}\n🚫 Banned: ${stats.permanentlyMutedCount}\n🤖 Bots: ${stats.botSuspectsCount}`;
          await sock.sendMessage(messageData.replyTo, { text: response });
          continue;
        }

        await checkBotStatus(sock, msg, ACTUAL_BOT_NUMBER + '@s.whatsapp.net');

        const thanos = getThanosStatus();
        if (thanos === "no") continue;

        const groupControl = getGroupControlStatus();
        if (groupControl === "yes") {
          const spamCheck = await realtimeSpamControl(sock, msg, ACTUAL_BOT_NUMBER + '@s.whatsapp.net', {
            maxChars: 160,
            adminLinkLimit: 2,
            enableBotDetection: true
          });

          if (spamCheck.action === 'deleted' || 
              spamCheck.action === 'spam_detected' ||
              spamCheck.action === 'link_deleted' ||
              spamCheck.action === 'bot_detected') {
            continue;
          }
        }

        if (messageData.chatType === 'GROUP') {
          const contextInfo = msg.message?.extendedTextMessage?.contextInfo || {};
          const quotedStanzaId = contextInfo.stanzaId;
          
          const messageText = messageData.messageContent.toLowerCase().trim();
          if (messageText === 'ping' || messageText === '.ping' || messageText === '!ping') {
            console.log('🏓 Ping command detected in group - responding');
            const sentMessage = await sendText(sock, 'ping', messageData.replyTo, msg);
            if (sentMessage) {
              await animatePong(sock, messageData.replyTo, sentMessage);
            }
            continue;
          }
          
          const isReplyToBot = quotedStanzaId && botMessageIds.has(quotedStanzaId);
          
          console.log('📊 Group message check:', {
            chatId: messageData.from,
            hasQuote: !!quotedStanzaId,
            quotedStanzaId,
            isReplyToBot,
            botMessageIds: Array.from(botMessageIds),
            willRespond: isReplyToBot
          });
          
          if (!isReplyToBot) {
            console.log('⏭️ Ignoring - not replying to bot');
            continue;
          }
          
          console.log('✅ Bot engaged - responding to reply');
        }

        if (messageData.messageContent.toLowerCase() === 'ping') {
          const sentMessage = await sendText(sock, messageData.messageContent, messageData.replyTo, msg);
          if (sentMessage) {
            await animatePong(sock, messageData.replyTo, sentMessage);
          }
        } else if (thanos === "yes") {
          console.log('🔄 Sending to AI');
          await privateChat(msg, sock, messageData.messageContent, messageData.replyTo, msg, [], true);
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in startWhatsAppBot:', error);
    setTimeout(() => startWhatsAppBot(), 10000);
  }
}

function extractMessageInfo(msg) {
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
    replyTo = getReplyJid(from);
    if (replyTo && !replyTo.includes('@')) {
      replyTo = replyTo + '@s.whatsapp.net';
    }
  }

  let messageContent = '';
  const messageType = Object.keys(msg.message)[0];
  
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
    case 'contactMessage':
      messageContent = `[Contact: ${msg.message.contactMessage?.displayName || 'Unknown'}]`;
      break;
    case 'locationMessage':
      messageContent = '[Location]';
      break;
    case 'reactionMessage':
      messageContent = `[Reaction: ${msg.message.reactionMessage?.text || '👍'}]`;
      break;
    case 'pollCreationMessage':
      messageContent = '[Poll]';
      break;
    default:
      messageContent = '[Unknown message type]';
  }

  return { 
    chatType, 
    from, 
    replyTo,
    sender, 
    senderName, 
    messageContent, 
    timestamp: new Date(msg.messageTimestamp * 1000) 
  };
}

io.on('connection', (socket) => {
  if (qrCode) {
    qrcode.toDataURL(qrCode).then(qrDataUrl => socket.emit('qr', qrDataUrl));
  } else if (pairingCode) {
    socket.emit('pairing-code', pairingCode);
  } else if (sock?.user) {
    socket.emit('connected', { name: sock.user?.name, number: ACTUAL_BOT_NUMBER });
  }
  
  socket.on('request-pairing-code', async (phoneNumber) => {
    try {
      if (sock) await sock.end();
      if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      await sessionsCollection.deleteMany({});
      await startWhatsAppBot(true, phoneNumber);
    } catch (error) {
      socket.emit('pairing-code-error', error.message);
    }
  });
  
  socket.on('logout', async () => {
    try {
      await sock?.logout();
      if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      await sessionsCollection.deleteMany({});
      setTimeout(() => startWhatsAppBot(), 2000);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  });
});

app.get('/', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

// Health check endpoint for Render
app.get('/health', (req, res) => {
  const isHealthy = !!sock?.user && mongoClient?.topology?.isConnected();
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    connected: !!sock?.user,
    dbConnected: !!mongoClient?.topology?.isConnected(),
    lastSync: new Date(lastSuccessfulSync).toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({
    ready: !!sock?.user,
    hasQR: !!qrCode,
    hasPairingCode: !!pairingCode,
    info: sock?.user ? { name: sock.user.name, number: ACTUAL_BOT_NUMBER } : null
  });
});

// Connection health monitor
setInterval(async () => {
  if (!sock?.user) return;
  
  const timeSinceSync = Date.now() - lastSuccessfulSync;
  
  // Force sync if no sync in 5 minutes
  if (timeSinceSync > 5 * 60 * 1000) {
    console.log('⚠️ Forcing auth sync due to timeout');
    try {
      await syncAuthToMongo();
    } catch (error) {
      console.error('❌ Force sync failed:', error);
    }
  }
}, 60000); // Check every minute

// Self-ping for paid Render plans (keeps instance warm)
if (process.env.RENDER && process.env.RENDER_EXTERNAL_URL) {
  setInterval(async () => {
    try {
      const response = await fetch(`${process.env.RENDER_EXTERNAL_URL}/health`);
      console.log('🏓 Self-ping:', response.status);
    } catch (error) {
      // Ignore errors
    }
  }, 14 * 60 * 1000); // Every 14 minutes
}

async function start() {
  try {
    await initMongoDB();
    await initHistoryDB(MONGO_URI);
    await startWhatsAppBot();
    server.listen(PORT, () => console.log(`\n🚀 Server running on http://localhost:${PORT}\n`));
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('⚠️ SIGTERM received, starting graceful shutdown...');
  
  // Stop accepting new connections
  server.close();
  
  // Sync auth one final time
  try {
    await syncAuthToMongo();
  } catch (error) {
    console.error('❌ Final sync failed:', error);
  }
  
  // Close WhatsApp connection gracefully
  if (sock) {
    try {
      await sock.end();
    } catch (error) {
      console.error('❌ Error closing socket:', error);
    }
  }
  
  // Close MongoDB
  if (mongoClient) {
    try {
      await mongoClient.close();
    } catch (error) {
      console.error('❌ Error closing MongoDB:', error);
    }
  }
  
  console.log('✅ Graceful shutdown complete');
  process.exit(0);
});

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('⚠️ SIGINT received, shutting down...');
  
  try {
    await syncAuthToMongo();
    if (sock) await sock.end();
    if (mongoClient) await mongoClient.close();
  } catch (error) {
    console.error('❌ Shutdown error:', error);
  }
  process.exit(0);
});

// Final sync before process exit
process.on('beforeExit', async () => {
  if (!isShuttingDown) {
    console.log('⚠️ Process exiting, final sync...');
    try {
      await syncAuthToMongo();
    } catch (error) {
      console.error('❌ beforeExit sync failed:', error);
    }
  }
});

process.on('unhandledRejection', (error) => console.error('Unhandled rejection:', error));

start();