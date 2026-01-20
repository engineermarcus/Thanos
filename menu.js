import { getUrlInfo } from '@whiskeysockets/baileys';

export function getMenuText(thanos, groupControl, stats) {
  return `
╔═══════════════════════════════╗
║        *THANOS MD*            ║
║   _Reality Stone Activated_    ║
╚═══════════════════════════════╝

┏━━━ *SYSTEM STATUS* ━━━┓
┃ Thanos Mode: ${thanos === "yes" ? "ACTIVE" : "INACTIVE"}
┃ Group Control: ${groupControl === "yes" ? "ON" : "OFF"}
┃ Banned Users: ${stats.permanentlyMutedCount}
┃ Bot Suspects: ${stats.botSuspectsCount}
┗━━━━━━━━━━━━━━━━━━━━━━┛

╭─────────────────────────╮
│   *BASIC COMMANDS*      │
╰─────────────────────────╯

- chat - Wake up the bot
- sleep - Put the bot to sleep
- groupcontrol on -  the bot takes over
- blacklist - Scan for spam accounts
- banned - View banned list
- unban @user - Unban someone
- checkban @user - Check ban status
- muted - View muted list
- menu - Show this menu
- ping - test bot

╭─────────────────────────╮
│   *CODE EXECUTION*      │
╰─────────────────────────╯

Run code in 100+ languages instantly!

*Syntax:* [language] [code]

*Examples:*
- python print("Hello")
- js console.log(5 + 5)
- cpp cout << "C++" << endl;
- java System.out.println("Java");

*Supported:* Python, JS, C++, Java, Rust, Go, 
PHP, Ruby, Kotlin, TypeScript, Lua, Bash & more!

╭─────────────────────────╮
│   *POWER FEATURES*      │
╰─────────────────────────╯

- snap @user - Erase existence + messages
- ghost - Auto-delete replies (60s)
- raid - Emergency lockdown mode
- clone @user - Mirror profile pic/status
- stalk @user - View activity & stats
- nuke [word] - Auto-delete messages with keyword
- whisper @user [msg] - Secret group message
- poll [q] | [opt1] | [opt2] - Create poll
- translate [text] - Auto-translate to English
- schedule [time] [msg] - Delayed send
- backup - Export all group data
- stats - Deep analytics & insights
- sticker - Reply to video/GIF to create sticker

╭─────────────────────────╮
│   *CHAOS MODE*          │
╰─────────────────────────╯

*USE WITH CAUTION!*

- thanos - Snap 50% of group members
- roulette - Random member elimination
- chaos - Randomize all roles (1 hour)

╭─────────────────────────╮
│   *INFO*                │
╰─────────────────────────╯

*Creator:* MCU NEIMAN TECH
*Version:* 1.0.0
*Power:* All 6 Infinity Stones
*Purpose:* Perfect Balance

_"I am inevitable."_ - Thanos

╚══════════════════════╝`;
}

export async function sendMenuWithImage(sock, chatJid, quotedMsg, thanos, groupControl, stats) {
  const menuImageUrl = 'https://files.catbox.moe/wmae3y.jpeg';
  const menuText = getMenuText(thanos, groupControl, stats);
  const channelJid = '120363426440331517@newsletter'; 

  try {
      await sock.sendMessage(chatJid, {
          image: { url: menuImageUrl },
          caption: menuText,
          contextInfo: {
              // This attaches the "View Channel" UI directly to the image message
              forwardingScore: 1,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                  newsletterJid: channelJid,
                  serverMessageId: 1,
                  newsletterName: 'THANOS MD BOT' // This appears at the top/bottom of the image
              },
              // This makes the 'Ad Reply' style appear inside the image context
              externalAdReply: {
                  title: "THANOS MD BOT",
                  body: "Tap to view official channel",
                  mediaType: 1,
                  sourceUrl: `https://whatsapp.com/channel/${channelJid.split('@')[0]}`, 
                  thumbnailUrl: menuImageUrl,
                  renderLargerThumbnail: false // Keep it sleek
              }
          }
      }, { quoted: quotedMsg });

      console.log('✅ Integrated Newsletter Menu Sent');
  } catch (error) {
      console.error('❌ Error sending integrated menu:', error);
  }
}