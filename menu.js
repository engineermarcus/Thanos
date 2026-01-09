export function getMenuText(thanos, groupControl, stats) {
  return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃    ⚡ *THANOS MD - MENU* ⚡      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📊 *STATUS*
🤖 Thanos: ${thanos === "yes" ? "✅" : "❌"}
🛡️ Protection: ${groupControl === "yes" ? "✅" : "❌"}
🚫 Banned: ${stats.permanentlyMutedCount}
🤖 Bots: ${stats.botSuspectsCount}

🎮 *COMMANDS*
- chat/type - Activate
- zip/sleep - Deactivate
- groupcontrol on/off
- blacklist - Scan spam
- banned - Show banned
- unban @user
- checkban @user
- muted - Show muted
- menu - This menu
- ping - Test bot

🛠️ MCU NEIMAN TECH | v1.0.0`;
}