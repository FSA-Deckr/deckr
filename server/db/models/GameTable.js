const Sequelize = require('sequelize')
const db = require('../db')

const GameTable = db.define('gameTable', {
accessCode: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
}
})

module.exports = GameTable
