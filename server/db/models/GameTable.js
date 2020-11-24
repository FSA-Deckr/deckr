const Sequelize = require('sequelize')
const db = require('../db')

const GameTable = db.define('gameTable', {
    accessCode: {
        type: Sequelize.STRING,
        allowNull: false
    }
  })
  
  module.exports = GameTable