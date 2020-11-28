const axios = require('axios')
const io = require('socket.io-client');
const renderLobby = require('./lobby');

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

        const socket = io('http://localhost:8080');
        
        socket.on('connect', function() {
           // Connected, let's sign-up for to receive messages for this room
           socket.emit('room', tableNumber);
        });
        
        socket.on('message', function(data) {
           console.log('Incoming message:', data);
        });

        root.innerHTML = `<div>You are in room ${tableNumber}</div>`
}

module.exports = {attemptToRenderTable, renderTable}