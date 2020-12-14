const router = require('express').Router();
const {GameTable, PlayerSession} = require('../db');

//this will update a player's info in DB (used when they exit out of game)
router.put('/', async (req, res, next) => {
    try {
        player = await PlayerSession.findOne({
            where: {
                id: req.cookies.sid
            }
        })
        
        let currTableId = player.gameTableId
        await player.update({gameTableId: req.body.gameTableId, playerNumber: req.body.playerNumber, prevTableId: currTableId})
        res.sendStatus(200)

    }
    catch(err) {
        next(err)
    }
})

module.exports = router;
