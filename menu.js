import { settings } from './settings.js';
const { creator } = settings();
const { creatorNum } = settings();

export function getMenuText(thanos, groupControl, stats) {
  return `
╔═══════════════╗
║ *THANOS MD BOT*           
╚═══════════════╝

┏ *SYSTEM STATUS* ━┓
┃ Thanos Mode: ${thanos === "yes" ? "ACTIVE" : "INACTIVE"}
┃ Group Control: ${groupControl === "yes" ? "ON" : "OFF"}
┃ Banned Users: ${stats.permanentlyMutedCount}
┃ Bot Suspects: ${stats.botSuspectsCount}
┗━━━━━━━━━━━━━┛

╭──────────────────╮
│   *GROUP COMMANDS* 
╰──────────────────╯

- banned - View banned list
- unban @user - Unban someone
- checkban @user - Check ban status
- muted - View muted list
- menu - Show this menu
- ping - test bot
- sticker - Video/GIF to sticker(0.93mb max)
- stalk @user - message privately (Coming Soon)
- snap @user - kick user (Coming Soon)
- clone @user - copy user profile (Coming Soon)
- kiss - (Coming Soon)
- Hug - (Coming Soon)
- Kill _ (Coming Soon)
- Snooze - (Coming Soon)
- Track - (Coming Soon)
- Hack @user - (Coming Soon)
- Raid @group - (Coming Soon)
- AutoGoodBye - (Coming Soon )
- Welcome - (Coming Soon)
- AntiViewOnce - (Coming Soon)
- TextToVideo - (Coming Soon)
- VideoToText - (Coming Soon)
- AntiMention - (Coming Soon)
- AntiTag - (Coming Soon)


╭──────────────────╮
│   *PRIVATE CHAT*  
╰──────────────────╯

- chat - Wake up the bot
- sleep - Put the bot to sleep
- 
╭──────────────────╮
│   *CODE EXECUTION*  
╰──────────────────╯

 *Run any code instantly*

 *Syntax* [language] [code]

*Example*

- python print("Hello From The Other Side")

_*(100 ++) Supported languages*_

╭───────────────╮
│ *DANGER ZONE* 
╰───────────────╯

- snap - Erase half of the group 
- nuke group - Coming Soon 
- self distract - Coming Soon (follow channel for updates)


╭───────────────╮
│        *INFO*        
╰───────────────╯

*DEVELOPERS:* _*NEIMAN TECH ENTERPRISES*_
*CREATOR*: *${creator}*
*PHONE:* *${creatorNum}*
*VERSION:* _1.2.0_
*POWER:* _2 Infinity Stones_
*PURPOSE:* _Balance_


`;
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