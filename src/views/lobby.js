const axios = require('axios')

function renderLobby() {
    const root = document.getElementById('root');

    root.innerHTML = 
    `
    <form id = "logInForm">
        <label>Access Code:</label>
        <input name ="accessCode" className = "accessCode" id="roomNumber"/>
        <button type ="submit" id = "logInButton" >Go to room</button>
    </form>
    <button id="newRoom">New room</button>`

    const createRoomButton = document.getElementById('newRoom')
    createRoomButton.addEventListener("click", async function(e) {
        const newGame = await axios.post('/api/game')
        window.location.pathname = `/${newGame.data.accessCode}/`
    })

    const joinRoomButton = document.getElementById('logInForm')
    joinRoomButton.addEventListener("submit", async function(e) {
        e.preventDefault()
        let roomNumber = document.getElementById('roomNumber')
        if (roomNumber.value) window.location.pathname = `/${roomNumber.value}/`
        roomNumber.value = ''
    })
}

module.exports = renderLobby