const router = require('express').Router();
const {GameTable, PlayerSession} = require('../db');

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
                    gameTableId: req.params.gameId
                }
            })
            const numPlayers = gameUsers.length

            //if the player refreshes after being on a table
            if (req.user.gameTableId === req.params.gameId) {
                res.send('welcome back')
            }
            else {
                //if table full
                if (numPlayers === 4) {
                    res.send('Sorry, this table is full')
                }
                //if table not full
                else {
                    await player.update({gameTableId: req.params.gameId})
                    req.user.gameTableId = req.params.gameId
                    res.send('You are a new player')
                }
            }
        }
        else {
            res.send('This game does not exist')
        }
    }
    catch(err) {
        next(err)
    }


})

module.exports = router;
