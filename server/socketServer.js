let socketServer;
const io = require('socket.io')
const chalk = require('chalk')

const setSocketServer = (server) => {
    socketServer = server;
    // handle incoming connections from clients
    socketServer.on('connection', function(socket) {
        // once a client has connected, we expect to get a ping from them saying what room they want to join
        socket.on('room', function(room) {
            this.join(room);
        });

        socket.on('sendGameState', function(gameState) {
            this.to(gameState.room).emit('receiveGameState', gameState);
        })

        socket.on('sendCard', function(cardState) {
            this.to(cardState.room).emit('receiveCard', {...cardState.card, otherPlayerDragging: cardState.otherPlayerDragging});
            if(cardState.isDragging) this.emit('receiveCard', {...cardState.card, otherPlayerDragging: !cardState.otherPlayerDragging});
        })

        socket.on('addCardToHand', function(cardState) {
            this.to(cardState.room).emit('addCardToHand', {card: cardState.card, player: cardState.player});
        })

        socket.on('removeCardFromHand', function(cardState) {
            this.to(cardState.room).emit('removeCardFromHand', {card: cardState.card, player: cardState.player});
        })

        socket.on('sendChip', function(chipState) {
            this.to(chipState.room).emit('receiveChip', {...chipState.chip, otherPlayerDragging: chipState.otherPlayerDragging});
            if(chipState.isDragging) this.emit('receiveChip', {...chipState.chip, otherPlayerDragging: !chipState.otherPlayerDragging});
        })

        socket.on('sendPointer', function(ptr) {
            this.to(ptr.room).emit('receivePointer', ptr)
        })

        socket.on('requestGameState', function({room, playerNumber}){
            this.to(room).emit('newPlayer', playerNumber)
        })

        socket.on('sendCollectChips', function({room, playerBanks, playerNumber}){
            this.to(room).emit('receiveCollectChips', {playerBanks, receivedPlayerNum: playerNumber})
        })

        socket.on('sendCollectCards', function({deck, room, playerNumber}){
            this.to(room).emit('receiveCollectCards', {receivedDeck: deck, receivedPlayerNum: playerNumber})
        })

        socket.on('bankChip', function({room, chipNumber, playerNumber}){
            this.to(room).emit('receiveBankChip', {chipNumber, playerNumber})
        })

        socket.on('joiningAs', function({streamId, playerNumber, room, relay}){
            this.to(room).emit('playerJoiningAs',{streamId, newPlayerNumber: playerNumber, relay})
        })
    });
}

const getSocketServer = () => socketServer;

module.exports = {
    setSocketServer,
    getSocketServer
}
