import Phaser from 'phaser'
import Chip from './Chip'
import Card from './Card'
import { canvasWidth, canvasHeight, cardDimensions, chipRadius,
        activeDepth, initialChips, chipNames, newItemRange,
        chipOffset, newItemRandom, cardOffset } from './Constants'
import { shuffleDeck } from './utility'

export class DeckrTable extends Phaser.Game {
  constructor(socket, room, _playerNumber){
    //phaser game object config
    const cfg = {
      type: Phaser.CANVAS,
      canvas: canvas,
      width: canvasWidth,
      height: canvasHeight,
      physics: {
        default: 'arcade',
        arcade: { debug: false}
      },
      scene: { preload, create }
    }

    super(cfg)

    //change body bg when table rendered
    deckrBody.setAttribute("style", "background: radial-gradient(circle at 50%, #50353C, #50353C 30%, #2D1D22);");

    //the deck is just an array of numbers representing the cards 0-51
    let chipsPhysicsGroup
    this.socket = socket;
    this.playerNumber = _playerNumber
    this.pointers = {}
    this.gameState = {
      deck: [],
      cards: {},
      chips: {},
      hands: {
        player1: {},
        player2: {},
        player3: {},
        player4: {},
      },
      room: room,
      playerBanks: {}
    };
    const { gameState, playerNumber, pointers } = this

    //counter for unique chip numbers
    this.currentChipNumber = 0

    //player chip total
    this.gameState.playerBanks[this.playerNumber] = initialChips

    function preload() {
      this.load.spritesheet('chipSprite','chipSpriteSheet.png', { frameWidth: chipRadius * 2, frameHeight: chipRadius * 2})
      this.load.spritesheet('cardSprite','cardSpriteSheet.png', { frameWidth: cardDimensions.width, frameHeight: cardDimensions.height})
      this.load.image('flip','flip.png')
      this.load.image('rotate','rotate.png')
      this.load.image('board','felt-square.png')
      this.load.image('deckCount', 'blankButton.png')
      this.load.image('shuffle', 'shuffleButton.png')
      this.load.image('glow', 'glow.png')
      //probably not the cleanest way to make a shuffled deck but whatever
      gameState.deck = makeDeck(52)
      shuffleDeck(gameState.deck)
    }

    function create() {
      //send initial message to ask for gameState
      socket.emit('requestGameState', {room: gameState.room, playerNumber: this.game.playerNumber})

      //add background image
      const cam = this.cameras.main
      switch(playerNumber) {
        case 2:
          cam.rotation = Math.PI/2;
          break;
        case (3):
          cam.rotation = Math.PI;
          break;
        case 4:
          cam.rotation = 3 * Math.PI/2;
          break;
        default:
          break;
      }
      this.add.image(canvasWidth/2, canvasHeight/2, 'board');

      //make Phaser physics groups
      chipsPhysicsGroup = this.physics.add.group();
      this.cardsPhysicsGroup = this.physics.add.group()

      //detect collision between chips, with a callback that induces spin
      this.physics.add.collider(chipsPhysicsGroup, chipsPhysicsGroup, function(chipA, chipB) {
        const ax = chipA.body.x
        const ay = chipA.body.y
        const bx = chipB.body.x
        const by = chipB.body.y
        const contactAngle = Math.atan2(bx-ax, by-ay)

        const avx = chipA.body.velocity.x
        const avy = chipA.body.velocity.y
        const bvx = chipB.body.velocity.x
        const bvy = chipB.body.velocity.y

        const impulseAngle = Math.atan2(bvx-avx,bvy-avy)

        let spinCoeff = contactAngle - impulseAngle
        spinCoeff = ((spinCoeff + Math.PI) % (Math.PI*2) - Math.PI) / Math.PI
        const spinSpeed = Math.sqrt(((avx+bvx)**2) + ((avy+bvy)**2))
        chipA.setAngularVelocity(1 * (spinCoeff) * spinSpeed * -1)
        chipB.setAngularVelocity(1 * (spinCoeff) * spinSpeed)
        if(chipA.playerPickedUp) socket.emit('sendChip', {chip: chipB, room: gameState.room, otherPlayerDragging: false})
        if(chipB.playerPickedUp) socket.emit('sendChip', {chip: chipA, room: gameState.room, otherPlayerDragging: false})
      })

      //create a chip in the chip physics group and at random location
      const addAChip = (denom) => {
        if(gameState.playerBanks[this.game.playerNumber] >= denom) {
          let xPosition, yPosition, orientation
          switch(this.game.playerNumber) {
            case 2:
              yPosition = Phaser.Math.Between(newItemRange, canvasHeight - newItemRange)
              xPosition = Phaser.Math.Between(canvasWidth - chipOffset - newItemRandom, canvasWidth - chipOffset + newItemRandom)
              orientation = 3 * Math.PI/2
              break;
            case (3):
              xPosition = Phaser.Math.Between(newItemRange, canvasWidth - newItemRange)
              yPosition = Phaser.Math.Between(chipOffset - newItemRandom, chipOffset + newItemRandom)
              orientation = Math.PI
              break;
            case 4:
              yPosition = Phaser.Math.Between(newItemRange, canvasHeight - newItemRange)
              xPosition = Phaser.Math.Between(chipOffset - newItemRandom, chipOffset + newItemRandom)
              orientation = Math.PI/2
              break;
            default:
              xPosition = Phaser.Math.Between(newItemRange, canvasWidth - newItemRange)
              yPosition = Phaser.Math.Between(canvasWidth - chipOffset - newItemRandom, canvasWidth - chipOffset + newItemRandom)
              orientation = 0
              break;
          }
          const chip = new Chip(this, xPosition, yPosition, chipsPhysicsGroup, this.game.currentChipNumber, denom, orientation)
          gameState.chips[chip.chipNumber] = chip
          this.game.currentChipNumber++
          //process current value for player
          gameState.playerBanks[this.game.playerNumber] -= denom
          socket.emit("sendGameState", gameState);
          this.updateBanks();
        }
      }

      //create a randomly numbered card in the card physics group
      const dealACard = (_deck) => {
        //only do it if there are cards in the deck
        if (!_deck.length) return
        //get top card and remove from deck
        const cardNumber = _deck.pop()
        //show card count on button
        dealButton.innerText = `Deal A Card (${_deck.length})`
        //orient and place card depending on player number
        let xPosition, yPosition, orientation
        switch(this.game.playerNumber) {
          case 2:
            yPosition = Phaser.Math.Between(newItemRange, canvasHeight - newItemRange)
            xPosition = Phaser.Math.Between(canvasWidth - cardOffset - newItemRandom, canvasWidth - cardOffset + newItemRandom)
            orientation = 3 * Math.PI/2
            break;
          case (3):
            xPosition = Phaser.Math.Between(newItemRange, canvasWidth - newItemRange)
            yPosition = Phaser.Math.Between(cardOffset - newItemRandom, cardOffset + newItemRandom)
            orientation = Math.PI
            break;
          case 4:
            yPosition = Phaser.Math.Between(newItemRange, canvasHeight - newItemRange)
            xPosition = Phaser.Math.Between(cardOffset - newItemRandom, cardOffset + newItemRandom)
            orientation = Math.PI/2
            break;
          default:
            xPosition = Phaser.Math.Between(newItemRange, canvasWidth - newItemRange)
            yPosition = Phaser.Math.Between(canvasWidth - cardOffset - newItemRandom, canvasWidth - cardOffset + newItemRandom)
            orientation = 0
            break;
        }
        //create the Phaser card
        const card = new Card(this, xPosition, yPosition, this.cardsPhysicsGroup, cardNumber, orientation);
        //put in cards obj and emit card and deck
        gameState.cards[card.cardNumber] = card;
        socket.emit("sendGameState", gameState);
      }

      //collect all chips on table for player
      const collectAllChips = () => {
        let totalValue = 0
        //loop through chips in gamestate, add up value and add to player's bank
        for(const chipNum in gameState.chips) {
          totalValue += gameState.chips[chipNum].chipValue
          //must destroy the phaser obj and delete the key in gamestate
          gameState.chips[chipNum].destroy()
          delete gameState.chips[chipNum]
        }
        gameState.playerBanks[this.game.playerNumber] += totalValue
        //emit event to collect chips and update player banks
        socket.emit("sendCollectChips", { room:gameState.room, playerBanks: gameState.playerBanks});
        //update the HTML for player banks
        this.updateBanks();
      }

      //collect all cards on table, shuffle
      const collectAllCards = () => {
        for(const cardNum in gameState.cards) {
          //must destroy the phaser obj and delete the key in gamestate
          gameState.cards[cardNum].destroy()
          delete gameState.cards[cardNum]
        }
        for(const player in gameState.hands) {
          gameState.hands[player] = {}
        }
        //sometimes cards in hand aren't phaser object but rather socket representations of them, so this makes sure all cards in the phaser world are killed
        this.cardsPhysicsGroup.clear(true,true)
        gameState.deck = makeDeck(52)
        shuffleDeck(gameState.deck)
        socket.emit("sendCollectCards", { deck: gameState.deck, room: gameState.room});
      }

      //update the HTML for player banks
      this.updateBanks = () => {
        const thisPlayerChips = gameState.playerBanks[this.game.playerNumber]
        playerChips.innerText = thisPlayerChips
        chipNames.forEach(chipName => {
          if(thisPlayerChips < +chipName.substring(4)) document.getElementById(chipName).className = 'greyOut chipImg'
          else document.getElementById(chipName).className = 'chipImg'
        })
        /////////////////////////////////////
        // for now, update playerBanks Div //
        /////////////////////////////////////
        playerBankDiv.innerHTML = `
        <p>Player 1 Bank: $ ${gameState.playerBanks[1]}</p>
        <p>Player 2 Bank: $ ${gameState.playerBanks[2]}</p>
        <p>Player 3 Bank: $ ${gameState.playerBanks[3]}</p>
        <p>Player 4 Bank: $ ${gameState.playerBanks[4]}</p>
        `
      }

      //clicking HTML elements for chips adds a chip w that value to the board
      chip1.onclick = () => addAChip(1)
      chip5.onclick = () => addAChip(5)
      chip25.onclick = () => addAChip(25)
      chip50.onclick = () => addAChip(50)
      chip100.onclick = () => addAChip(100)
      chip500.onclick = () => addAChip(500)

      //deal card, collect chips, collect cards into deck
      dealButton.onclick = () => dealACard(gameState.deck)
      chipCollect.onclick = () => collectAllChips()
      cardCollect.onclick = () => collectAllCards()

      socket.on('receiveCard', (receivedCard) => {
        //put all cards where they belong and with their rotations and reveal status
        if (!receivedCard.inHand) {
          gameState.cards[receivedCard.cardNumber].setPosition(receivedCard.x, receivedCard.y)
          gameState.cards[receivedCard.cardNumber].setRotation(receivedCard.rotation)
          gameState.cards[receivedCard.cardNumber].setRevealed(receivedCard.revealed)
          gameState.cards[receivedCard.cardNumber].body.setVelocity(receivedCard.velocity.x,receivedCard.velocity.y)
          gameState.cards[receivedCard.cardNumber].otherPlayerDragging = receivedCard.otherPlayerDragging
          gameState.cards[receivedCard.cardNumber].stackNumber = receivedCard.stackNumber
          gameState.cards[receivedCard.cardNumber].stackOrder = receivedCard.stackOrder
          gameState.cards[receivedCard.cardNumber].showCounter(receivedCard.stackOrder - 1)
          gameState.cards[receivedCard.cardNumber].setDepth(receivedCard.depth)
        }
      })

      socket.on('receiveChip', (receivedChip) => {
        //put all cards where they belong and with their rotations and reveal status
        gameState.chips[receivedChip.chipNumber].setPosition(receivedChip.x, receivedChip.y)
        gameState.chips[receivedChip.chipNumber].setRotation(receivedChip.rotation)
        gameState.chips[receivedChip.chipNumber].body.setVelocity(receivedChip.velocity.x,receivedChip.velocity.y)
        gameState.chips[receivedChip.chipNumber].body.setAngularVelocity(receivedChip.angularVelocity)
        gameState.chips[receivedChip.chipNumber].otherPlayerDragging = receivedChip.otherPlayerDragging
      })

      socket.on('receiveGameState', (receivedGameState) => {
        const { cards, chips, deck, hands, playerBanks } = receivedGameState;
        //update the deck
        gameState.deck = deck;

        //for each receivedCard in gamestate, make new card if it doesn't exist
        for(let receivedCardNum in cards) {
          // adds cards to table
          if(!gameState.cards[receivedCardNum]) {
            const receivedCard = cards[receivedCardNum];
            dealButton.innerText = `Deal A Card (${deck.length})`
            const card = new Card(this, receivedCard.x, receivedCard.y, this.cardsPhysicsGroup, receivedCardNum)
            gameState.cards[card.cardNumber] = card;
          }
          //put all cards where they belong and with their rotations and reveal status
          gameState.cards[receivedCardNum].setPosition(cards[receivedCardNum].x, cards[receivedCardNum].y)
          gameState.cards[receivedCardNum].setRotation(cards[receivedCardNum].rotation)
          gameState.cards[receivedCardNum].setRevealed(cards[receivedCardNum].revealed)
          gameState.cards[receivedCardNum].body.setVelocity(cards[receivedCardNum].velocity.x,cards[receivedCardNum].velocity.y)
          gameState.cards[receivedCardNum].stackNumber = cards[receivedCardNum].stackNumber
          gameState.cards[receivedCardNum].stackOrder = cards[receivedCardNum].stackOrder
          gameState.cards[receivedCardNum].showCounter(cards[receivedCardNum].stackOrder - 1)
          gameState.cards[receivedCardNum].setDepth(cards[receivedCardNum].depth)
        }

        //render cards in your hand, if they don't exist for some reason (refresh?)
        //cycle through YOUR hand cards coming from the received game state
        const handToModify = hands[`player${playerNumber}`];
        for (let handCardKey in handToModify) {
          //if the card doesn't already exist in your local gameState
          if (!gameState.hands[`player${playerNumber}`][handCardKey]){
            //create/render it
            const newHandCard = new Card(this, handToModify[handCardKey].x, handToModify[handCardKey].y, this.cardsPhysicsGroup, handCardKey);
            newHandCard.setRevealed(handToModify[handCardKey].revealed);
            newHandCard.inHand = true;
            newHandCard.setRotation((4 * (Math.PI/2)) - ((playerNumber - 1) * (Math.PI/2)));
            newHandCard.body.setCollideWorldBounds(false);
            newHandCard.x = handToModify[handCardKey].x;
            newHandCard.y = handToModify[handCardKey].y;
            //add it to your local gameState
            handToModify[handCardKey] = newHandCard;
          }
        }
        //update the rest of the hands in local gameState
        gameState.hands = hands;
        gameState.hands[`player${playerNumber}`] = handToModify;

        for(let receivedChipNumber in chips) {
          // adds chips to table
          if(!gameState.chips[receivedChipNumber]) {
            const receivedChip = chips[receivedChipNumber];
            const chip = new Chip(this, receivedChip.x, receivedChip.y, chipsPhysicsGroup, receivedChipNumber, +receivedChip.chipValue)
            gameState.chips[chip.chipNumber] = chip;
            this.game.currentChipNumber = +chip.chipNumber+1
          }
          //put all chips where they belong and with their rotations
          gameState.chips[receivedChipNumber].setPosition(chips[receivedChipNumber].x, chips[receivedChipNumber].y)
          gameState.chips[receivedChipNumber].body.setVelocity(chips[receivedChipNumber].velocity.x, chips[receivedChipNumber].velocity.y)
          gameState.chips[receivedChipNumber].body.setAngularVelocity(chips[receivedChipNumber].angularVelocity)
          gameState.chips[receivedChipNumber].setRotation(chips[receivedChipNumber].rotation)
        }
        //update player banks gamestate
        gameState.playerBanks = playerBanks

        //update HTML for player banks
        this.updateBanks();
      })

      socket.on('addCardToHand', (cardState) => {
        gameState.hands[cardState.player][cardState.card.cardNumber] = cardState.card;
        gameState.cards[cardState.card.cardNumber].destroy();
        delete gameState.cards[cardState.card.cardNumber];
      })

      socket.on('removeCardFromHand', (cardState) => {
        const removedCard = new Card(this, cardState.card.x, cardState.card.y, this.cardsPhysicsGroup, cardState.card.cardNumber);
        gameState.cards[removedCard.cardNumber] = removedCard;
        delete gameState.hands[cardState.player][cardState.card.cardNumber];
      })

      //emit pointer position whenever moved in world
      this.input.on('pointermove', (ptr)=>{
        socket.emit('sendPointer', {x: ptr.worldX, y: ptr.worldY, pointerNumber: playerNumber, room: gameState.room})
      })

      //draw other ppls pointers
      socket.on('receivePointer', ({ x, y, pointerNumber })=>{
        if(pointers[pointerNumber]) {
          pointers[pointerNumber].x = x
          pointers[pointerNumber].y = y
        } else {
          const ptrColors = {
            1:0xff1100,
            2:0x0400ff,
            3:0xff9d00,
            4:0x9500ff
          }
          const newPointer = this.add.circle(x,y,10,ptrColors[pointerNumber])
          newPointer.setAlpha(0.5)
          newPointer.setDepth(activeDepth + 1)
          pointers[pointerNumber] = newPointer
        }
      })

      //send game state if you are player 1 and a new player joins
      socket.on('newPlayer', (newPlayerNumber)=>{
        gameState.playerBanks[newPlayerNumber] = initialChips
        //update HTML for player banks
        this.updateBanks();
        if(playerNumber===1) socket.emit("sendGameState", gameState);
      })

      //if someone's collected the chips, delete them all from screen
      socket.on('receiveCollectChips', (playerBanks)=>{
        for(const chipNum in gameState.chips) {
          //must destroy the phaser obj and delete the key in gamestate
          gameState.chips[chipNum].destroy()
          delete gameState.chips[chipNum]
        }
        //update the gamestate
        gameState.playerBanks = playerBanks

        //update HTML for player banks
        this.updateBanks();
      })

      //if someone's banked a single chip, update their bank
      socket.on('receiveBankChip', ({playerNumber, chipNumber})=>{
        //update the gamestate
        gameState.playerBanks[playerNumber] += gameState.chips[chipNumber].chipValue

        //must destroy the phaser obj and delete the key in gamestate
        gameState.chips[chipNumber].destroy()
        delete gameState.chips[chipNumber]

        //update HTML for player banks
        this.updateBanks();
      })

      //if someone's collected the cards, delete them all from screen and update the deck
      socket.on('receiveCollectCards', (receivedDeck)=>{
        for(const cardNum in gameState.cards) {
          //must destroy the phaser obj and delete the key in gamestate
          gameState.cards[cardNum].destroy()
          delete gameState.cards[cardNum]
        }
        for(const player in gameState.hands) {
          gameState.hands[player] = {}
        }
        this.cardsPhysicsGroup.clear(true,true)
        gameState.deck = receivedDeck
        //update the card button count HTML
        dealButton.innerText = `Deal A Card (${gameState.deck.length})`
      })

      //receive new player stream ID and update DIV
      socket.on('playerJoiningAs', ({streamId, newPlayerNumber, relay})=>{
        let streamDiv
        const remoteContainer = document.getElementById('game')
        if(document.getElementById(streamId)) {
            streamDiv = document.getElementById(streamId)
        } else {
            streamDiv = document.createElement("div");
            streamDiv.id = streamId;
            remoteContainer.appendChild(streamDiv);
        }
        const divPositions = ['rightDiv','topDiv','leftDiv']
        const divIx = -1+(+newPlayerNumber-playerNumber+4)%4
        streamDiv.className = `${divPositions[divIx]} videoStream playerColor${newPlayerNumber}`
        //need to alert new player of my id
        if(relay)socket.emit('joiningAs',{streamId: myVideo.getAttribute('localId'), playerNumber, room, relay:false})
      })
    }

    //fill deck w random numbers
    const makeDeck = (numCards) => {
      const _deck = []
      for(let i = 0; i < numCards; i++) {
        _deck.push(i)
      }
      dealButton.innerText = `Deal A Card (${_deck.length})`
      return _deck
    }

  }
}
