const axios = require('axios')

const createGame = async () => {
    await axios.post('/api/game')
}

const addWindowListener = async() => {
    window.addEventListener("beforeunload", async function(e) {
        await axios.put('/api/player', {gameTableId: null})
    })
}

module.exports = {createGame, addWindowListener}

