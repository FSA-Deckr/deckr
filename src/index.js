const renderLobby = require('./views/lobby');
const {attemptToRenderTable} = require('./views/table');

if (window.location.pathname === '/home/') {
    renderLobby();
}
else {
    const path = window.location.pathname
    const strippedPath = path.substring(1,path.length-1);
    attemptToRenderTable(strippedPath);
}


