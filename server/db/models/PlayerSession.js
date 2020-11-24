const Sequelize = require('sequelize')
const db = require('../db')

const PlayerSession = db.define('playerSession', {
    id: {
      type: Sequelize.DataTypes.UUID,
      defaultValue: Sequelize.DataTypes.UUIDV4,
      primaryKey: true,
    },
    playerNumber: {
        type: Sequelize.INTEGER
    }
  })
  
  module.exports = PlayerSession