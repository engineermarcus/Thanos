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

🔥 *POWER FEATURES*
- snap @user - Delete user + all their messages
- ghost - Auto-delete bot replies after 60s
-raid - Emergency lockdown (mute all, admin-only)
- clone @user - Copy someone's profile pic/status
- stalk @user - Show join date, message count, activity
- nuke keyword - Auto-delete messages with word
- whisper @user message - Send private in group
- poll question | option1 | option2 - Create vote
- translate - Auto-translate messages to English
- schedule time message - Send delayed message
- backup - Export all group data
- stats - Deep analytics (top posters, peak hours)

⚔️ *CHAOS MODE*
- thanos - Random ban 50% of group
- roulette - Random member gets kicked
- chaos - Randomize everyone's roles for 1 hour

🛠️ MCU NEIMAN TECH | v1.0.0`;
}