const router = require('express').Router();

//this will update a player's info in DB (used when they exit out of game)
router.get('/', async (req, res, next) => {
    try {
        return [process.env.APPID, process.env.APPCERTIFICATE]
    }
    catch(err) {
        next(err)
    }
})

module.exports = router;
