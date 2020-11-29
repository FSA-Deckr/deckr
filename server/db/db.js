const Sequelize = require('sequelize')

const db = new Sequelize(process.env.DATABASE_URL || 
    'postgres://lalhost:5432/deckr'
    // 'postgres://localhost/deckr'
    , {logging: false})

module.exports = db
