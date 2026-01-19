export function getMenuText(thanos, groupControl, stats) {
  return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃    ⚡ *THANOS MD - MENU* ⚡     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📊 *STATUS*
🤖 Thanos: ${thanos === "yes" ? "✅" : "❌"}
🛡️ Protection: ${groupControl === "yes" ? "✅" : "❌"}
🚫 Banned: ${stats.permanentlyMutedCount}
🤖 Bots: ${stats.botSuspectsCount}

🎮 *BASIC COMMANDS*
- chat/type - Activate
- play/song - Download audio
- video - Download video 
- zip/sleep - Deactivate
- groupcontrol on/off
- blacklist - Scan spam
- banned - Show banned
- unban @user
- checkban @user
- muted - Show muted
- menu - This menu
- ping - Test bot

💻 *CODE RUNNER*
- [lang] [code] - Execute 100+ languages
- Example: python print("Hello World")
- Example: js console.log(5 + 5)
- Supports: Py, JS, C++, Java, Rust, Go, & more.

🔥 *POWER FEATURES*
- snap @user - Delete user + all messages
- ghost - Auto-delete bot replies (60s)
- raid - Emergency lockdown (admin-only)
- clone @user - Copy profile pic/status
- stalk @user - Show activity & join date
- nuke keyword - Auto-delete messages with word
- whisper @user message - Private in group
- poll question | opt1 | opt2 - Create vote
- translate - Auto-translate to English
- schedule time message - Delayed message
- backup - Export all group data
- stats - Deep analytics & peak hours

⚔️ *CHAOS MODE*
- thanos - Randomly ban 50% of group
- roulette - Random member gets kicked
- chaos - Randomize roles for 1 hour

🛠️ MCU NEIMAN TECH | v1.0.0`;
}