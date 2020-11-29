const renderLobby = require('./views/lobby');
const {attemptToRenderTable, socketRoomInstance} = require('./views/table');
import game from './phaser'

if (window.location.pathname === '/home/') {
    renderLobby();
}
else {
    const path = window.location.pathname
    const strippedPath = path.substring(1,path.length-1);
    attemptToRenderTable(strippedPath);
}

testEmit.onclick = async function() {
    //send a message to socket server
    const { socket, room } = await socketRoomInstance()
    socket.emit('test',{room,message:'hi!'})
}
