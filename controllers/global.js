import { getThanosStatus, setThanosStatus } from "../settings.js";

export async function checkBotStatus(WASock, msg, botNumber) {
  const activateBot = ["chat", "type"];
  const deactivateBot = ["zip", "shut up", "sleep"];

  // Only check for commands if message is from bot owner
  if (msg.key.fromMe) {
    const messageContent = (
      msg.message?.conversation || 
      msg.message?.extendedTextMessage?.text || 
      ''
    ).toLowerCase();

    const shouldActivate = activateBot.some(word => messageContent.includes(word));
    const shouldDeactivate = deactivateBot.some(word => messageContent.includes(word));

    if (shouldActivate) {
        setThanosStatus("yes");
        await WASock.sendMessage(botNumber, { text: "✅ Thanos is Now Active" });
    } 
    else if (shouldDeactivate) {
        setThanosStatus("no");
        await WASock.sendMessage(botNumber, { text: "❌ Thanos has been deactivated" });
    }
  }

  // Always return current status
  return getThanosStatus();
}