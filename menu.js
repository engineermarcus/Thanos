export function getMenuText(thanos, groupControl, stats) {
  return `
╔═══════════════════════════════╗
║     ⚡ *THANOS MD* ⚡          ║
║   _Reality Stone Activated_    ║
╚═══════════════════════════════╝

┏━━━ 📊 *SYSTEM STATUS* ━━━┓
┃ 🤖 Thanos Mode: ${thanos === "yes" ? "✅ ACTIVE" : "❌ INACTIVE"}
┃ 🛡️ Group Control: ${groupControl === "yes" ? "✅ ON" : "❌ OFF"}
┃ 🚫 Banned Users: ${stats.permanentlyMutedCount}
┃ 🤖 Bot Suspects: ${stats.botSuspectsCount}
┗━━━━━━━━━━━━━━━━━━━━━━┛

╭─────────────────────────╮
│   🎮 *BASIC COMMANDS*   │
╰─────────────────────────╯

- \`chat\` / \`type\` - Wake up bot
- \`zip\` / \`sleep\` - Put bot to sleep
- \`groupcontrol on/off\` - Toggle protection
- \`blacklist\` - Scan for spam accounts
- \`banned\` - View banned list
- \`unban @user\` - Unban someone
- \`checkban @user\` - Check ban status
- \`muted\` - View muted list
- \`menu\` - Show this menu
- \`ping\` - Check bot response time

╭─────────────────────────╮
│   💻 *CODE EXECUTION*   │
╰─────────────────────────╯

Run code in 100+ languages instantly!

📌 *Syntax:* \`[language] [code]\`

*Examples:*
- \`python print("Hello")\`
- \`js console.log(5 + 5)\`
- \`cpp cout << "C++" << endl;\`
- \`java System.out.println("Java");\`

*Supported:* Python, JS, C++, Java, Rust, Go, 
PHP, Ruby, Kotlin, TypeScript, Lua, Bash & more!

╭─────────────────────────╮
│   🔥 *POWER FEATURES*   │
╰─────────────────────────╯

- \`snap @user\` - Erase existence + messages
- \`ghost\` - Auto-delete replies (60s)
- \`raid\` - Emergency lockdown mode
- \`clone @user\` - Mirror profile pic/status
- \`stalk @user\` - View activity & stats
- \`nuke [word]\` - Auto-delete messages with keyword
- \`whisper @user [msg]\` - Secret group message
- \`poll [q] | [opt1] | [opt2]\` - Create poll
- \`translate [text]\` - Auto-translate to English
- \`schedule [time] [msg]\` - Delayed send
- \`backup\` - Export all group data
- \`stats\` - Deep analytics & insights
- \`sticker\` - Reply to video/GIF to create sticker

╭─────────────────────────╮
│   ⚔️ *CHAOS MODE*       │
╰─────────────────────────╯

⚠️ *USE WITH CAUTION!*

- \`thanos\` - Snap 50% of group members
- \`roulette\` - Random member elimination
- \`chaos\` - Randomize all roles (1 hour)

╭─────────────────────────╮
│   ℹ️ *INFO*             │
╰─────────────────────────╯

🛠️ *Creator:* MCU NEIMAN TECH
📦 *Version:* 1.0.0
⚡ *Power:* All 6 Infinity Stones
🌌 *Purpose:* Perfect Balance

_"I am inevitable."_ - Thanos

╚═══════════════════════════════╝`;
}

// Send menu with image from URL
export async function sendMenuWithImage(sock, chatJid, quotedMsg, thanos, groupControl, stats) {
  const menuImageUrl = 'https://files.catbox.moe/517zbz.jpg';
  const menuText = getMenuText(thanos, groupControl, stats);
  
  try {
    await sock.sendMessage(chatJid, {
      image: { url: menuImageUrl },
      caption: menuText
    }, { quoted: quotedMsg });
    
    console.log('✅ Menu sent with image');
  } catch (error) {
    console.error('❌ Error sending menu with image:', error);
    
    // Fallback to text only if image fails
    await sock.sendMessage(chatJid, {
      text: menuText
    }, { quoted: quotedMsg });
    
    console.log('⚠️ Menu sent as text (image failed)');
  }
}