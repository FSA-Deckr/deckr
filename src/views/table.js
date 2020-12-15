const axios = require('axios')
const io = require('socket.io-client');
const renderLobby = require('./lobby');
const startVideo = require('../agora')
const {DeckrTable} = require('../DeckrTable');

async function attemptToRenderTable(tableNumber) {

    let gameTable = await axios.get(`/api/game/${tableNumber}`)
    let playerNumber = gameTable.data.playerNumber
    let agoraKeys = gameTable.data.gameTable
    if (gameTable.status === 206) {
        window.location.pathname = '/home'
        console.log('Sorry, this game is full')
    }
    else if (gameTable.status === 204) {
        window.location.pathname = '/home'
        console.log('Sorry, this game was not found')
    }
    else {
        await renderTable(tableNumber, playerNumber,agoraKeys);
    }
}

async function renderTable(tableNumber,playerNumber,agoraKeys) {
    const table = document.getElementById('table');
    const buttonControls = document.getElementById('buttonControls');
    const root = document.getElementById('root')
    //this just updates db with info when a player Xs out
    window.addEventListener("beforeunload", async function(e) {
        await axios.put('/api/player', {gameTableId: null, playerNumber: null})
    })

    const socket = io('/');
    const room = tableNumber
    const initialBank = await axios.get(`/api/game/${tableNumber}/bank/${playerNumber}`)
    socket.on('connect', function() {
        //send room number to connect to it
        socket.emit('room', tableNumber);
    });
    socket.on('message', function(data) {
        console.log('Incoming message:', data);
    });
    const canvas = 'canvas'
    root.innerHTML = ''
    table.innerHTML = `
    <div id='game'>
        <canvas id= '${canvas}'></canvas>
        <div id='bank'>
            <div class='bank-bar-button' id='dealButton'>Deal A Card</div>
            <div id='chip1' class='chipImg'></div>
            <div id='chip5' class='chipImg'></div>
            <div id='chip25' class='chipImg'></div>
            <div id='chip50' class='chipImg'></div>
            <div id='chip100' class='chipImg'></div>
            <div id='chip500' class='chipImg'></div>
            <div id='chipCount'>$<span id='playerChips'>${initialBank.data.bank}</span></div>
            <div class='bank-bar-button' id='chipCollect'>Collect Chips</div>
            <div class='bank-bar-button' id='cardCollect'>Collect Cards</div>
        </div>
        <div id='myVideoContainer' class='videoContainer'>
            <p>You are Player ${playerNumber}</p>
            <div id='myVideo' class='videoStream playerColor${playerNumber}'></div>
            <div class = 'media-control'>
            <button id="mic-btn" type="button" class="btn btn-block btn-dark btn-lg">
            <i id="mic-icon" class="fas fa-microphone"></i>
            </button>
            <button id="video-btn"  type="button" class="btn btn-block btn-dark btn-lg">
            <i id="video-icon" class="fas fa-video"></i>
            </button>
            <div>
        </div>

        <div id="boardLogo"><a href='/home'>deckr</a></div>
        <div id="tableNumber">
            <p>Room code:</p>
            <p>${tableNumber}</p>
        </div>
    </div>
    `

    const game = new DeckrTable(socket, room, playerNumber, initialBank.data.bank)
    startVideo(agoraKeys,playerNumber,socket, tableNumber)
}

module.exports = {attemptToRenderTable, renderTable}
