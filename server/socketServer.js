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

        socket.on('test', function(data) {
            this.to(data.room).emit('message', data.message + '?')
        })

        socket.on('sendGameState', function(gameState) {
            this.to(gameState.room).emit('receiveGameState', gameState);
        })

        socket.on('sendCard', function(cardState) {
            this.to(cardState.room).emit('receiveCard', {...cardState.card, isDragging: cardState.isDragging});
        })
    });

}

const getSocketServer = () => socketServer;

module.exports = {
    setSocketServer,
    getSocketServer
}