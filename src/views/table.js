const axios = require('axios')
const io = require('socket.io-client');
const renderLobby = require('./lobby');
const startVideo = require('../agora')
const {DeckrTable} = require('../DeckrTable')


async function attemptToRenderTable(tableNumber) {
    let gameTable = await axios.get(`/api/game/${tableNumber}`)
    let playerNumber = gameTable.data.playerNumber
    if (gameTable.status === 206) {
        window.location.pathname = '/home'
        console.log('Sorry, this game is full')
    }
    else if (gameTable.status === 204) {
        window.location.pathname = '/home'
        console.log('Sorry, this game was not found')
    }
    else {
        await renderTable(tableNumber, playerNumber);
    }
}

async function renderTable(tableNumber,playerNumber) {
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
        const canvas = 'canvas'

        root.innerHTML = `<div>You are in room ${tableNumber}</div>
        <div id='me'></div>
        <div id="remote-container"></div>
        <canvas id= '${canvas}'></canvas>
        <p>
          <button id="newChip">Add a chip</button>
          <select id="chipValue">
            <option value=1>1</option>
            <option value=5>5</option>
            <option value=25>25</option>
            <option value=50>50</option>
            <option value=100>100</option>
            <option value=500>500</option>
          </select>
          <button id="newCard">Deal a card (0)</button>
          <button id="collectCards">Collect cards & shuffle</button>
        </p>
        <p>
            Player1 Card: <span id="p1Card"></span>
            Player2 Card: <span id="p2Card"></span>
            Player3 Card: <span id="p3Card"></span>
            Player4 Card: <span id="p4Card"></span>
        </p>

      </body>`

        const game = new DeckrTable(socket, room, playerNumber)
        // startVideo(channelNum)
}

module.exports = {attemptToRenderTable, renderTable}
