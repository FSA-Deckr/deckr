let socketServer;
const io = require('socket.io')

const setSocketServer = (server) => {
    socketServer = server;
    // handle incoming connections from clients
    socketServer.on('connection', function(socket) {
        // once a client has connected, we expect to get a ping from them saying what room they want to join
        socket.on('room', function(room) {
            console.log('the room is', room)
            socket.join(room);
            socketServer.to(room).emit('message', `the is a message from the websocket to people in ${room}?`);
        });
        

    });

}

const getSocketServer = () => socketServer;

module.exports = {
    setSocketServer,
    getSocketServer
}
