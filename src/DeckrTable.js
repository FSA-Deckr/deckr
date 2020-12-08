import Phaser from 'phaser'
import Chip from './Chip'
import Card from './Card'
import { canvasWidth, canvasHeight, cardDimensions, chipRadius, activeDepth, initialChips, chipNames, newItemRange, chipOffset, newItemRandom, cardOffset } from './Constants'

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

    //the deck is just an array of numbers representing the cards 0-51
    let cardsPhysicsGroup, chipsPhysicsGroup
    this.socket = socket;
    this.playerNumber = _playerNumber
    this.pointers = {}
    this.gameState = {
      deck: [],
      cards: {},
      chips: {},
      room: room,
      playerBanks: {}
    };
    const { gameState, playerNumber, pointers } = this

    //counter for unique chip numbers
    this.currentChipNumber = 0

    //player chip total
    this.playerChipTotal = +initialChips
    this.gameState.playerBanks[this.playerNumber] = this.playerChipTotal

    function preload() {
      this.load.image('chip','chip.png')
      this.load.spritesheet('chipSprite','chipSpriteSheet.png', { frameWidth: chipRadius * 2, frameHeight: chipRadius * 2})
      this.load.image('shadow','shadow.png')
      this.load.spritesheet('cardSprite','cardSpriteSheet.png', { frameWidth: cardDimensions.width, frameHeight: cardDimensions.height})
      this.load.image('flip','flip.png')
      this.load.image('rotate','rotate.png')
      this.load.image('board','board.jpg')
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
      cardsPhysicsGroup = this.physics.add.group()

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
      })

      //create a chip in the chip physics group and at random location
      const addAChip = (denom) => {
        if(this.game.playerChipTotal >= denom) {
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
          this.game.playerChipTotal -= denom
          playerChips.innerText = this.game.playerChipTotal
          chipNames.forEach(chipName => {
            if(this.game.playerChipTotal < +chipName.substring(4)) document.getElementById(chipName).className = 'greyOut chipImg'
          })
          //update player bank in gamestate
          gameState.playerBanks[this.game.playerNumber] = this.game.playerChipTotal
        ///////////////////////////////////////////////////////////////////
        //  for now, update playerBanks Div //////////////////////////////
        //////////////////////////////////////////////////////////////////
        playerBankDiv.innerHTML = `
        <p>Player 1 Bank: $ ${gameState.playerBanks[1]}</p>
        <p>Player 2 Bank: $ ${gameState.playerBanks[2]}</p>
        <p>Player 3 Bank: $ ${gameState.playerBanks[3]}</p>
        <p>Player 4 Bank: $ ${gameState.playerBanks[4]}</p>
        `
          socket.emit("sendGameState", gameState);
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
        const card = new Card(this, xPosition, yPosition, cardsPhysicsGroup, cardNumber, orientation);
        //put in cards obj and emit card and deck
        gameState.cards[card.cardNumber] = card;
        socket.emit("sendGameState", gameState);
      }

      //collect all chips on table for player
      const collectAllChips = () => {
        let totalValue = 0
        //loop through chips in gamestate, add up value and add to playerChipTotal
        for(const chipNum in gameState.chips) {
          totalValue += gameState.chips[chipNum].chipValue
          //must destroy the phaser obj and delete the key in gamestate
          gameState.chips[chipNum].destroy()
          delete gameState.chips[chipNum]
        }
        this.game.playerChipTotal += totalValue
        //update the HTML
        playerChips.innerText = this.game.playerChipTotal
        chipNames.forEach(chipName => {
          if(this.game.playerChipTotal < +chipName.substring(4)) document.getElementById(chipName).className = 'greyOut chipImg'
          else document.getElementById(chipName).className = 'chipImg'
        })
        //update the gamestate
        gameState.playerBanks[this.game.playerNumber] = this.game.playerChipTotal
        ///////////////////////////////////////////////////////////////////
        //  for now, update playerBanks Div //////////////////////////////
        //////////////////////////////////////////////////////////////////
        playerBankDiv.innerHTML = `
        <p>Player 1 Bank: $ ${gameState.playerBanks[1]}</p>
        <p>Player 2 Bank: $ ${gameState.playerBanks[2]}</p>
        <p>Player 3 Bank: $ ${gameState.playerBanks[3]}</p>
        <p>Player 4 Bank: $ ${gameState.playerBanks[4]}</p>
        `
        //emit event to collect chips and update player banks
        socket.emit("sendCollectChips", { room:gameState.room, playerBanks: gameState.playerBanks});
      }

      //collect all cards on table, shuffle
      const collectAllCards = () => {
        for(const cardNum in gameState.cards) {
          //must destroy the phaser obj and delete the key in gamestate
          gameState.cards[cardNum].destroy()
          delete gameState.cards[cardNum]
        }
        gameState.deck = makeDeck(52)
        shuffleDeck(gameState.deck)
        socket.emit("sendCollectCards", { deck: gameState.deck, room: gameState.room});
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
        gameState.cards[receivedCard.cardNumber].setPosition(receivedCard.x, receivedCard.y)
        gameState.cards[receivedCard.cardNumber].setRotation(receivedCard.rotation)
        gameState.cards[receivedCard.cardNumber].setRevealed(receivedCard.revealed)
        gameState.cards[receivedCard.cardNumber].body.setVelocity(receivedCard.velocity.x,receivedCard.velocity.y)
        gameState.cards[receivedCard.cardNumber].otherPlayerDragging = receivedCard.otherPlayerDragging
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
        const { cards, chips, deck, playerBanks } = receivedGameState;
        //update the deck
        gameState.deck = deck;
        //for each receivedCard in gamestate, make new card if it doesn't exist
        for(let receivedCardNum in cards) {
          // adds cards to table
          if(!gameState.cards[receivedCardNum]) {
            const receivedCard = cards[receivedCardNum];
            dealButton.innerText = `Deal A Card (${deck.length})`
            const card = new Card(this, receivedCard.x, receivedCard.y, cardsPhysicsGroup, receivedCardNum)
            gameState.cards[card.cardNumber] = card;
          }
          //put all cards where they belong and with their rotations and reveal status
          gameState.cards[receivedCardNum].setPosition(cards[receivedCardNum].x, cards[receivedCardNum].y)
          gameState.cards[receivedCardNum].setRotation(cards[receivedCardNum].rotation)
          gameState.cards[receivedCardNum].setRevealed(cards[receivedCardNum].revealed)
          gameState.cards[receivedCardNum].body.setVelocity(cards[receivedCardNum].velocity.x,cards[receivedCardNum].velocity.y)
        }
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
        //update player banks
        gameState.playerBanks = playerBanks
        ///////////////////////////////////////////////////////////////////
        //  for now, update playerBanks Div //////////////////////////////
        //////////////////////////////////////////////////////////////////
        playerBankDiv.innerHTML = `
        <p>Player 1 Bank: $ ${gameState.playerBanks[1]}</p>
        <p>Player 2 Bank: $ ${gameState.playerBanks[2]}</p>
        <p>Player 3 Bank: $ ${gameState.playerBanks[3]}</p>
        <p>Player 4 Bank: $ ${gameState.playerBanks[4]}</p>
        `
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
        ///////////////////////////////////////////////////////////////////
        //  for now, update playerBanks Div //////////////////////////////
        //////////////////////////////////////////////////////////////////
        playerBankDiv.innerHTML = `
        <p>Player 1 Bank: $ ${gameState.playerBanks[1]}</p>
        <p>Player 2 Bank: $ ${gameState.playerBanks[2]}</p>
        <p>Player 3 Bank: $ ${gameState.playerBanks[3]}</p>
        <p>Player 4 Bank: $ ${gameState.playerBanks[4]}</p>
        `
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

        ///////////////////////////////////////////////////////////////////
        //  for now, update playerBanks Div //////////////////////////////
        //////////////////////////////////////////////////////////////////
        playerBankDiv.innerHTML = `
        <p>Player 1 Bank: $ ${gameState.playerBanks[1]}</p>
        <p>Player 2 Bank: $ ${gameState.playerBanks[2]}</p>
        <p>Player 3 Bank: $ ${gameState.playerBanks[3]}</p>
        <p>Player 4 Bank: $ ${gameState.playerBanks[4]}</p>
        `
      })

      //if someone's banked a single chip, update their bank
      socket.on('receiveBankChip', ({playerNumber, chipNumber})=>{
        //update the gamestate
        gameState.playerBanks[playerNumber] += gameState.chips[chipNumber].chipValue

        //must destroy the phaser obj and delete the key in gamestate
        gameState.chips[chipNumber].destroy()
        delete gameState.chips[chipNumber]

        ///////////////////////////////////////////////////////////////////
        //  for now, update playerBanks Div //////////////////////////////
        //////////////////////////////////////////////////////////////////
        playerBankDiv.innerHTML = `
        <p>Player 1 Bank: $ ${gameState.playerBanks[1]}</p>
        <p>Player 2 Bank: $ ${gameState.playerBanks[2]}</p>
        <p>Player 3 Bank: $ ${gameState.playerBanks[3]}</p>
        <p>Player 4 Bank: $ ${gameState.playerBanks[4]}</p>
        `
      })

      //if someone's collected the cards, delete them all from screen and update the deck
      socket.on('receiveCollectCards', (receivedDeck)=>{
        for(const cardNum in gameState.cards) {
          //must destroy the phaser obj and delete the key in gamestate
          gameState.cards[cardNum].destroy()
          delete gameState.cards[cardNum]
        }
        gameState.deck = receivedDeck
        //update the HTML
        dealButton.innerText = `Deal A Card (${gameState.deck.length})`
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

    //fisher-yates array shuffle
    const shuffleDeck = array => {
      let currentIndex = array.length, temporaryValue, randomIndex;
      while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }
      return array;
    }
  }
}
