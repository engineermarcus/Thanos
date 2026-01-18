//===================================================
//FILL IN THE SETTINGS WITHIN QUOTES ""
//==========================================================

//_________________________________________________________________
//_____________SELECT YOUR DATABASE NAME____________________________

const dbName = process.env.DB_NAME || "stark"; // my-data-base or your-name

//______________________________________________________________________
//_________________INTELLIGENCE CORE____________________________________
      
const GROQ_API_KEY = process.env.GROQ_API_KEY || "api_key"; // Get your api key here: https://console.groq.com/keys

//______________________________________________________________________
//_________________BOT STATE MANAGEMENT__________________________________

// Persistent bot state - initialized once when module loads
let botState = {
    //_____________________________________________________________________
    //_____________________________________________________________________
    thanos: process.env.THANOS || "yes",
    groupControl: process.env.GROUP_CONTROL || "yes"  // Controls spam/link/bot detection
    //___________________________________________________________________________
    //___________________________________________________________________________
};

export function getThanosStatus() {
    return botState.thanos;
}

export function setThanosStatus(status) {
    botState.thanos = status;
    console.log(`[State Updated] Thanos is now: ${status}`);
}

export function getGroupControlStatus() {
    return botState.groupControl;
}

export function setGroupControlStatus(status) {
    botState.groupControl = status;
    console.log(`[State Updated] Group Control is now: ${status}`);
}

export function settings() {
    return { dbName, GROQ_API_KEY };
}