import Phaser from 'phaser'
import Chip from './Chip'
import Card from './Card'
import { canvasWidth, canvasHeight, cardDimensions } from './Constants'

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
    this.gameState = {
      deck: [],
      cards: {},
      chips: {},
      room: room
    };
    const { gameState, playerNumber } = this

    this.currentChipNumber = 0

    function preload() {
      this.load.image('chip','chip.png')
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
      //add background image
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
      const addAChip = () => {
        const chip = new Chip(this, Phaser.Math.Between(200, 600),Phaser.Math.Between(200, 600), chipsPhysicsGroup, this.game.currentChipNumber)
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
        const { cards, chips, deck } = receivedGameState;
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
        for(let receivedChipNumber in chips) {
          // adds chips to table
          if(!gameState.chips[receivedChipNumber]) {
            const receivedChip = chips[receivedChipNumber];
            const chip = new Chip(this, receivedChip.x, receivedChip.y, chipsPhysicsGroup, receivedChipNumber)
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
