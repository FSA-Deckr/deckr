import Phaser from 'phaser'
import Chip from './Chip'
import Card from './Card'
import { canvasWidth, canvasHeight, cardDimensions, chipRadius, activeDepth } from './Constants'

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
      hands: {
        player1: {},
        player2: {},
        player3: {},
        player4: {},
      },
      room: room
    };
    const { gameState, playerNumber, pointers } = this

    this.currentChipNumber = 0

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
      socket.emit('requestGameState', gameState)

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
        // socket.emit('sendChip', { chip: chipA, room: gameState.room, otherPlayerDragging: false })
        // socket.emit('sendChip', { chip: chipB, room: gameState.room, otherPlayerDragging: false })
      })

      //create a chip in the chip physics group and at random location
      const addAChip = () => {
        const chip = new Chip(this, Phaser.Math.Between(200, 600),Phaser.Math.Between(200, 600), chipsPhysicsGroup, this.game.currentChipNumber, chipValue.value)
        gameState.chips[chip.chipNumber] = chip
        this.game.currentChipNumber++
        socket.emit("sendGameState", gameState);
      }

      //create a randomly numbered card in the card physics group
      const dealACard = (_deck) => {
        //only do it if there are cards in the deck
        if (!_deck.length) return
        //get top card and remove from deck
        const cardNumber = _deck.pop()
        //show card count on button
        newCard.innerText = `Deal a card (${_deck.length})`
        //create the Phaser card
        const card = new Card(this, Phaser.Math.Between(200, 600),Phaser.Math.Between(590, 610), cardsPhysicsGroup, cardNumber);
        //put in cards obj and emit card and deck
        gameState.cards[card.cardNumber] = card;
        socket.emit("sendGameState", gameState);
      }

      //some buttons for testing
      newChip.onclick = addAChip
      newCard.onclick = () =>dealACard(gameState.deck)
      collectCards.onclick = () => collectAllCards(cardsPhysicsGroup, gameState.deck)

      socket.on('receiveCard', (receivedCard) => {
        //put all cards where they belong and with their rotations and reveal status
        if (!receivedCard.inHand) {
          gameState.cards[receivedCard.cardNumber].setPosition(receivedCard.x, receivedCard.y)
          gameState.cards[receivedCard.cardNumber].setRotation(receivedCard.rotation)
          gameState.cards[receivedCard.cardNumber].setRevealed(receivedCard.revealed)
          gameState.cards[receivedCard.cardNumber].body.setVelocity(receivedCard.velocity.x,receivedCard.velocity.y)
          gameState.cards[receivedCard.cardNumber].otherPlayerDragging = receivedCard.otherPlayerDragging
        } else {
          gameState.hands[`player${receivedCard.player}`][receivedCard.cardNumber].x = receivedCard.x;
          gameState.hands[`player${receivedCard.player}`][receivedCard.cardNumber].y = receivedCard.y;
          gameState.hands[`player${receivedCard.player}`][receivedCard.cardNumber].revealed = receivedCard.revealed;
          gameState.hands[`player${receivedCard.player}`][receivedCard.cardNumber].rotation = receivedCard.rotation;
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
        const { cards, chips, deck, hands } = receivedGameState;
        //update the deck
        gameState.deck = deck;

        //for each receivedCard in gamestate, make new card if it doesn't exist
        for(let receivedCardNum in cards) {
          // adds cards to table
          if(!gameState.cards[receivedCardNum]) {
            const receivedCard = cards[receivedCardNum];
            newCard.innerText = `Deal a card (${deck.length})`
            const card = new Card(this, receivedCard.x, receivedCard.y, cardsPhysicsGroup, receivedCardNum)
            gameState.cards[card.cardNumber] = card;
          }
          //put all cards where they belong and with their rotations and reveal status
          gameState.cards[receivedCardNum].setPosition(cards[receivedCardNum].x, cards[receivedCardNum].y)
          gameState.cards[receivedCardNum].setRotation(cards[receivedCardNum].rotation)
          gameState.cards[receivedCardNum].setRevealed(cards[receivedCardNum].revealed)
          gameState.cards[receivedCardNum].body.setVelocity(cards[receivedCardNum].velocity.x,cards[receivedCardNum].velocity.y)
        }
        //for hands recieved in gameState from sockets
        for (let playerHand in hands) {
          // for each card in a hand
          for (let handCard in hands[playerHand]) {
            //if it doesn't already exist in the hand OR on the table for some reason, make the card
            if (!gameState.hands[playerHand][handCard] && !gameState.cards[handCard]) {
              let cardInHand = hands[playerHand][handCard];
              const card = new Card(this, cardInHand.x, cardInHand.y, cardsPhysicsGroup, handCard);
              card.body.setCollideWorldBounds(false);
              gameState.hands[playerHand][card.cardNumber] = card;
            }
            //set position and rotation of the card
            gameState.hands[playerHand][handCard].body.setCollideWorldBounds(false);
            gameState.hands[playerHand][handCard].setPosition(hands[playerHand][handCard].x, hands[playerHand][handCard].y);
            gameState.hands[playerHand][handCard].setRotation(hands[playerHand][handCard].rotation);
            gameState.hands[playerHand][handCard].setRevealed(hands[playerHand][handCard].revealed);
            //set visibility of card, dependent on player number
            if (playerHand === `player${playerNumber}`) {
              gameState.hands[playerHand][handCard].setVisible(true);
            } else {
              gameState.hands[playerHand][handCard].setVisible(false);
            }
          }
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
      })

      socket.on('addCardToHand', (removeCardState) => {
        gameState.cards[removeCardState.cardNumber].setVisible(false);
        gameState.hands[removeCardState.player][removeCardState.cardNumber] = gameState.cards[removeCardState.cardNumber];
        delete gameState.cards[removeCardState.cardNumber];
      })

      socket.on('removeCardFromHand', (removeCardState) => {
        gameState.cards[removeCardState.cardNumber] = gameState.hands[removeCardState.player][removeCardState.cardNumber];
        gameState.cards[removeCardState.cardNumber].setVisible(true);
        delete gameState.hands[removeCardState.player][removeCardState.cardNumber];
      })

      this.input.on('pointermove', (ptr)=>{
        // console.log(ptr)
        socket.emit('sendPointer', {x: ptr.worldX, y: ptr.worldY, pointerNumber: playerNumber, room: gameState.room})
      })

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

      socket.on('newPlayer', ()=>{
        if(playerNumber===1) socket.emit("sendGameState", gameState);
      })
    }

    //clear all cards and make a new deck
    const collectAllCards = (_cards, _deck) => {
      _cards.clear(true, true)
      _deck = makeDeck(52)
      shuffleDeck(_deck)
    }

    //fill deck w random numbers
    const makeDeck = (numCards) => {
      const _deck = []
      for(let i = 0; i < numCards; i++) {
        _deck.push(i)
      }
      newCard.innerText = `Deal a card (${_deck.length})`
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
