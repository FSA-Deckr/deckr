const axios = require('axios')
const io = require('socket.io-client');
const renderLobby = require('./lobby');
const startVideo = require('../agora')
const {DeckrTable} = require('../DeckrTable');
const { initialChips } = require('../Constants');


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
    socket.on('connect', function() {
        //send room number to connect to it
        socket.emit('room', tableNumber);
    });
    socket.on('message', function(data) {
        console.log('Incoming message:', data);
    });
    const canvas = 'canvas'
    root.innerHTML = `<div>You are in room ${tableNumber}</div>`
    table.innerHTML = `
    <div id="remote-container"></div>
    <div id='game'>
        <canvas id= '${canvas}'></canvas>
        <div id='bank'>
            <div id='dealButton'>Deal A Card</div>
            <div id='chip1' class='chipImg'></div>
            <div id='chip5' class='chipImg'></div>
            <div id='chip25' class='chipImg'></div>
            <div id='chip50' class='chipImg'></div>
            <div id='chip100' class='chipImg'></div>
            <div id='chip500' class='chipImg'></div>
            <div id='chipCount'>$<span id='playerChips'>${initialChips}</span></div>
            <div id='chipCollect'>Collect Chips</div>
            <div id='cardCollect'>Collect Cards</div>
        </div>
    </div>
    <div id='me'></div>

    `
    playerIndicator.innerHTML = `
    <p>You are player #${playerNumber}</p>
    `

    const game = new DeckrTable(socket, room, playerNumber)
    startVideo(agoraKeys,playerNumber)
}

module.exports = {attemptToRenderTable, renderTable}
