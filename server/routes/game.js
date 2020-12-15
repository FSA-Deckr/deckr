const router = require('express').Router();
const {GameTable, PlayerSession} = require('../db');

let keys = null
try {
    keys = require('../../apikey')
} catch(ex) {
    console.log('ok')
}

//getting keys from heroku config

const agoraKeys = keys || {
        1:{
            appId : process.env.APPID,
            appCertificate: process.env.APPCERTIFICATE
        },
        2:{
            appId : process.env.APPID_2,
            appCertificate: process.env.APPCERTIFICATE_2
        },
        3:{
            appId : process.env.APPID_3,
            appCertificate: process.env.APPCERTIFICATE_3
        }
    }

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

            const playerNums = gameUsers.length ? gameUsers.map( user => user.playerNumber) : [];
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
                //if the player refreshes after being on a table, or comes back after exiting out
                const bank = player.prevTableId === gameTable.id ? player.bank : 1000
                await player.update({gameTableId: gameTable.id, playerNumber: newPlayerNum, bank})
                req.gameTableId = gameTable.id;
                req.playerNumber = newPlayerNum;
            //hard coding the first key for now, since we have limited keys
                res.json({gameTable: agoraKeys[1], playerNumber: req.playerNumber})
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


router.put('/:gameId/bank', async (req, res, next) => {
    try {
        const gameTable = await GameTable.findOne({
            where: {
                accessCode: req.params.gameId
            }
        })

        const gameUsers = await PlayerSession.findAll({
            where: {
                gameTableId: gameTable.id
            }
        })

        let playerBankUpdates = [];

        gameUsers.forEach( user => {
            playerBankUpdates.push(user.update({bank: req.body[user.playerNumber]}))
        })

        await Promise.all(playerBankUpdates)
        res.sendStatus(200)
    }
    catch(err) {
        next(err)
    }
})

router.get('/:gameId/bank/:playerNumber', async (req, res, next) => {
    const gameTable = await GameTable.findOne({
        where: {
            accessCode: req.params.gameId
        }
    })

    const gameUser = await PlayerSession.findOne({
        where: {
            playerNumber: req.params.playerNumber,
            gameTableId: gameTable.id
        }
    })

    res.send({bank: gameUser.bank});
})

module.exports = router;
