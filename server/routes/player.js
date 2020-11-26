const router = require('express').Router();
const {GameTable, PlayerSession} = require('../db');

router.put('/', async (req, res, next) => {
    try {

        player = await PlayerSession.findOne({
            where: {
                id: req.cookies.sid
            }
        })
        await player.update({gameTableId: req.body.gameTableId})
        res.sendStatus(200)

    }
    catch(err) {
        next(err)
    }
})

module.exports = router;
