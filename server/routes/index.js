const router = require('express').Router()

router.use('/game', require('./game'))
router.use('/player', require('./player'))
router.use('/agora', require('./agora'))

router.use((req, res, next) => {
    const err = new Error('API route not found!')
    err.status = 404
    next(err)
    })

module.exports = router
