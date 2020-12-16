const router = require('express').Router();
const {GameTable, PlayerSession} = require('../db');
const {RtcTokenBuilder, RtcRole} = require('agora-access-token');

//keys for localhost on dev
let keys = null
try {
    keys = require('../../apikey')
} catch(ex) {
    console.log('ok')
}

//getting keys from heroku config
const agoraKeys = keys || {
    appId : process.env.APPID,
    appCertificate: process.env.APPCERTIFICATE
}
const appId = agoraKeys.appId
const appCertificate = agoraKeys.appCertificate
console.log(appId, appCertificate)
const uid = 0;
const role = RtcRole.PUBLISHER;
const expirationTimeInSeconds = 3600
const currentTimestamp = Math.floor(Date.now() / 1000)
const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

//this post request creates a new game room
router.post('/', async (req, res, next) => {
    try {
        let accessCode;
        let created = false;
        let foundTable;

        while (!created) {
            //radix 36 uses 0-9 and a-z
            accessCode = Math.random().toString(36).substr(2, 6).toUpperCase()

            //check if table with this access code exists
            foundTable = await GameTable.findOne({where: {accessCode}})

            //if this access code hasn't been used, use it. Otherwise, loop around and try a new code.
            if (!foundTable) {
                const newGame = await GameTable.create({accessCode})
                res.send(newGame)
                created = true
            }
        }
    }
    catch(err) {
        next(err)
    }
})

//this get request will place someone in a room (if allowed) according to their cookie and db
//206 if the table was full
//204 if the table doesn't exist
router.get('/:gameId', async (req, res, next) => {
    try {

        const gameTable = await GameTable.findOne({
            where: {
                accessCode: req.params.gameId
            }
        })

        const player = await PlayerSession.findOne({
            where: {
                id: req.cookies.sid
            }
        })

        if (gameTable) {
            const gameUsers = await PlayerSession.findAll({
                where: {
                    gameTableId: gameTable.id
                }
            })

            // Build token with uid
            const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, req.params.gameId, uid, role, privilegeExpiredTs);

            const playerNums = gameUsers.length ? gameUsers.map( user => user.playerNumber) : [];
            //if the player refreshes after being on a table
            if (req.gameTableId === req.params.gameId) {
                //hard coding the first key for now, since we have limited keys
                res.status(200).json({token, playerNumber})
            }
            else {
                //if table full
                if (playerNums.length === 4) {
                    res.sendStatus(206)
                }
                //if table not full
                else {
                    let newPlayerNum;
                    for (let testNum = 1; testNum <= 4; testNum++) {
                        if (!playerNums.includes(testNum)) {
                            newPlayerNum = testNum;
                            break;
                        }
                    }
                    await player.update({gameTableId: gameTable.id, playerNumber: newPlayerNum})
                    req.gameTableNum = req.params.gameId;
                    req.playerNumber = newPlayerNum;
                //hard coding the first key for now, since we have limited keys
                    res.status(200).json({token, playerNumber: req.playerNumber})
                }
            }
        }
        //if no game table found
        else {
            res.sendStatus(204)
        }
    }
    catch(err) {
        next(err)
    }


})

module.exports = router;
