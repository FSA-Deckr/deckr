const {RtcTokenBuilder, RtcRole} = require('agora-access-token');

const appID = '27e02b529ce040c89ae5d7a2b4434606';
const appCertificate = '5ec7355ed8be4e7b802419c3f8fb090b';
const channelName = 'deckr';
const uid = 0;
const role = RtcRole.PUBLISHER;

const expirationTimeInSeconds = 3600

const currentTimestamp = Math.floor(Date.now() / 1000)

const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds


// Build token with uid
const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
console.log("Token With Integer Number Uid: " + tokenA);

