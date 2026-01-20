//===================================================
//FILL IN THE SETTINGS WITHIN QUOTES ""
//==========================================================


//__________________________________________________________________________
//_________________BOT STATE MANAGEMENT______________________________________

// Persistent bot state - initialized once when module loads
let botState = {
    //________________________________________________________________________________
    //________________________________________________________________________________
    thanos: process.env.THANOS || "yes",
    groupControl: process.env.GROUP_CONTROL || "yes"  // Controls spam/link/bot detection
    //___________________________________________________________________________________________
    //___________________________________________________________________________________________
};
//_______________________________________________________________________________________________________
//____________________________STATUS_____________________________________________________________________
const autoviewStatus = process.env.STATUS || "yes";
const autolikeStatus = process.env.LIKE || "yes";
const autoreplyStatus = process.env.REPLY || "yes";

//_____________________________________________________________________________________________________________
//_______________________________________BOT______________________________________________________________________
const effective = process.env.EFFECTIVE || "yes"; // Chat in groups and modify group data
const creator = process.env.CREATOR || "Neiman Marcus"; // Replace with your name 
const creatorNum = process.env.NUM || "254725693306"; // replace with your number 

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
    return {
        effective, 
        autoviewStatus, 
        autolikeStatus, 
        autoreplyStatus,
        creator, 
        creatorNum
    };
}
