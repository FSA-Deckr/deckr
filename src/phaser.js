import Phaser from 'phaser'
import Chip from './Chip'
import Card from './Card'

const cfg = {
  type: Phaser.CANVAS,
  canvas: canvas,
  width: 800,
  height: 800,
  physics: {
    default: 'arcade',
    arcade: { debug: false}
  },
  scene: { preload, create }
}

const game = new Phaser.Game(cfg)
//chips and cards are Phaser physics groups
//the deck is just an array of numbers representing the cards 0-51
let chips, cards, deck

function preload() {
  this.load.image('chip','chip.png')
  //these are fixed widths for the current deck image, probabbly should change later
  this.load.spritesheet('cardSprite','cardSpriteSheet.png', { frameWidth: 125, frameHeight: 175})
  this.load.image('flip','flip.png')
  this.load.image('board','board.jpg')
  //probably not the cleanest way to make a shuffled deck but whatever
  deck = makeDeck(52)
  shuffleDeck(deck)
}

function create() {
  //add background image
  this.add.image(400, 400, 'board');

  //make Phaser physics groups
  chips = this.physics.add.group();
  cards = this.physics.add.group()

  //detect collision between chips, with a callback that induces spin
  this.physics.add.collider(chips, chips, function(chipA, chipB) {
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
    const chip = new Chip(this, Phaser.Math.Between(200, 600),Phaser.Math.Between(200, 600), chips)
    //put all chips below all cards
    chip.setDepth(0);
  }

  //create a randomly numbered card in the card physics group
  const dealACard = (_deck) => {
    //only do it if there are cards in the deck
    if (!_deck.length) return
    //get a random card
    const randomCardIndex = Math.floor(Math.random() * _deck.length);
    //remove said card
    _deck.splice(randomCardIndex, 1)
    //show card count on button
    newCard.innerText = `Deal a card (${_deck.length})`
    //create the Phaser card
    const card = new Card(this, Phaser.Math.Between(200, 600),Phaser.Math.Between(590, 610), cards, _deck[randomCardIndex])
    //put it on top
    card.setDepth(1);
  }

  //some buttons for testing
  newChip.onclick = addAChip
  newCard.onclick = () =>dealACard(deck)
  collectCards.onclick = () => collectAllCards(cards, deck)
}

//clear all cards and make a new deck
const collectAllCards = (_cards, _deck) => {
  _cards.clear(true, true)
  deck = makeDeck(52)
  shuffleDeck(deck)
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
