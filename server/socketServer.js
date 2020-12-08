let socketServer;
const io = require('socket.io')
const chalk = require('chalk')

const setSocketServer = (server) => {
    socketServer = server;
    // handle incoming connections from clients
    socketServer.on('connection', function(socket) {
        // once a client has connected, we expect to get a ping from them saying what room they want to join
        socket.on('room', function(room) {
            console.log(chalk.yellow('the room is', room))
            this.join(room);
            this.to(room).emit('message', `the is a message from the websocket to people in ${room}?`);
        });

        socket.on('sendGameState', function(gameState) {
            this.to(gameState.room).emit('receiveGameState', gameState);
        })

        socket.on('sendCard', function(cardState) {
            this.to(cardState.room).emit('receiveCard', {...cardState.card, otherPlayerDragging: cardState.otherPlayerDragging});
            if(cardState.isDragging) this.emit('receiveCard', {...cardState.card, otherPlayerDragging: !cardState.otherPlayerDragging});
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

        socket.on('sendCollectChips', function({room, playerBanks}){
            this.to(room).emit('receiveCollectChips', playerBanks)
        })

        socket.on('sendCollectCards', function({deck, room}){
            this.to(room).emit('receiveCollectCards', deck)
        })

        socket.on('bankChip', function({room, chipNumber, playerNumber}){
            this.to(room).emit('receiveBankChip', {chipNumber, playerNumber})
        })
    });
}

const getSocketServer = () => socketServer;

module.exports = {
    setSocketServer,
    getSocketServer
}
