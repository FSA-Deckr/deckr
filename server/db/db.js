const Sequelize = require('sequelize')

const db = new Sequelize(process.env.DATABASE_URL || 
     //heroku bd 
    // 'postgres://lalhost:5432/deckr' 
    //heroku bd 
    'postgres://localhost/deckr'
    , {logging: false})

module.exports = db
