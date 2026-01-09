
export async function sendMessageToThanos(message, conversationHistory = []) {
    // Your deployed HuggingFace endpoint
    const API_URL = 'https://pico-faraday-thanos.hf.space/chat';
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: conversationHistory.slice(-6) // Last 6 messages only
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error! status: ${response.status}, ${errorData.error || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.response || "...";

    } catch (error) {
        console.error('❌ Thanos API Error:', error.message);
        
        const fallbacks = [
            "...",
            "connection died lol",
            "brb",
            "tech issues rn",
            "give me a sec",
            "servers are cooked"
        ];
        
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
}