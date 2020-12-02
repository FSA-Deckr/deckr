const axios = require('axios')
const io = require('socket.io-client');
const renderLobby = require('./lobby');
const startVideo = require('../agora')
const {DeckrTable} = require('../DeckrTable')

async function attemptToRenderTable(tableNumber) {
    let gameTable = await axios.get(`/api/game/${tableNumber}`)

    if (gameTable.status === 206) {
        window.location.pathname = '/home'
        console.log('Sorry, this game is full')
    }
    else if (gameTable.status === 204) {
        window.location.pathname = '/home'
        console.log('Sorry, this game was not found')
    }
    else {
        await renderTable(tableNumber);
    }
}

async function renderTable(tableNumber) {
    const root = document.getElementById('root');

        //this just updates db with info when a player Xs out
        window.addEventListener("beforeunload", async function(e) {
            await axios.put('/api/player', {gameTableId: null, playerNumber: null})
        })

        const socket = io('/');
        const room = tableNumber
        socket.on('connect', function() {
            //send room number to connect to it
            socket.emit('room', tableNumber);
        });
        socket.on('message', function(data) {
           console.log('Incoming message:', data);
        });
        startVideo()
        root.innerHTML = `<div>You are in room ${tableNumber}</div>
        <canvas id="canvas"></canvas>
        <p>
          <button id="newChip">Add a chip</button>
          <button id="newCard">Deal a card (0)</button>
          <button id="collectCards">Collect cards & shuffle</button>
        </p>
      </body>`

        const game = new DeckrTable(socket, room)
}

module.exports = {attemptToRenderTable, renderTable}
