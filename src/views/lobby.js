const axios = require('axios')

function renderLobby() {
    const root = document.getElementById('root');

    root.innerHTML = 
    `
    <h1>deckr</h1>
    <button id="newRoom">Create a table</button>
    <form id = "logInForm">
        <label>Join a table</label>
        <input name ="accessCode" className = "accessCode" id="roomNumber" placeholder="Table Code"/>
        <button type ="submit" id = "logInButton" >JOIN</button>
    </form>
    `

    const createRoomButton = document.getElementById('newRoom')
    createRoomButton.addEventListener("click", async function(e) {
        const newGame = await axios.post('/api/game')
        window.location.pathname = `/${newGame.data.accessCode}/`
    })

    const joinRoomButton = document.getElementById('logInForm')
    joinRoomButton.addEventListener("submit", async function(e) {
        e.preventDefault()
        let roomNugmber = document.getElementById('roomNumber')
        if (roomNumber.value) window.location.pathname = `/${roomNumber.value}/`
        roomNumber.value = ''
    })
}

module.exports = renderLobby
