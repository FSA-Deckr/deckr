import Phaser from 'phaser'
import { boardDrag, cardDimensions, hoverButtonRadius, cardBackFrame, 
        cardDepth, activeDepth, canvasHeight, inHandAdjustment, 
        canvasWidth, inHandRange, textOffset, magnetRadius } from './Constants'
import { shuffleDeck } from './utility'

export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, physicsGroup, cardNumber, orientation = Math.PI/2) {
    super(scene, x, y)
    //add images to container
    this.shadow = scene.add.image(0,0,'shadow')
    this.card = scene.add.sprite(0,0,'cardSprite')
    this.glow = scene.add.image(0,0,'glow').setVisible(false)
    this.card.setFrame(cardBackFrame)
    this.flipButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius, hoverButtonRadius - cardDimensions.height/2,'flip').setVisible(false)
    this.rotateButton = scene.add.image(hoverButtonRadius - cardDimensions.width/2, cardDimensions.height/2 - hoverButtonRadius,'rotate').setVisible(false)
    this.shuffleButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius, cardDimensions.height/2 - hoverButtonRadius,'shuffle').setVisible(false)
    this.stackCounter = scene.add.image(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2,'deckCount').setVisible(false)
    this.count = scene.add.text(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2, Number(0), { fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif', color: 'rgb(0, 0, 0)' }).setVisible(false).setOrigin(0.5,0.5)
    this.add([this.glow, this.shadow,this.card,this.flipButton,this.rotateButton,this.shuffleButton,this.stackCounter, this.count])

    //socket and room info for emit events
    this.gameState = scene.game.gameState;
    this.playerNumber = scene.game.playerNumber;
    this.socket = scene.game.socket;

    //set container size and add to scene, make interactive
    scene.add.existing(this);
    this.setSize(cardDimensions.width, cardDimensions.height)
    this.setDepth(cardDepth)
    this.setInteractive({draggable: true});
    this.flipButton.setInteractive({draggable: true})
    this.rotateButton.setInteractive({draggable: true})
    this.stackCounter.setInteractive({draggable: true})
    this.shuffleButton.setInteractive({draggable: true})

    //make card interact w physics
    physicsGroup.add(this)
    this.body.setDrag(boardDrag);
    this.body.useDamping = true;
    this.body.setBounce(1,1)
    this.body.setCollideWorldBounds(true)
    this.rotation = orientation

    //event listeners
      this.dragHistory = []
      this.on('dragstart', ()=>this.dragStart(true))
      this.on('drag', (ptr)=>this.drag(ptr));
      this.on('dragend', this.dragEnd);
      this.on('pointerover', this.hover)
      this.on('pointerout', this.unhover)

      this.stackCounter.on('dragstart', ()=> this.dragStart())
      this.stackCounter.on('drag', (ptr)=>this.drag(ptr, true));
      this.stackCounter.on('dragend', () => this.dragEnd());

      const buttonArray = [this.rotateButton, this.flipButton, this.shuffleButton, this.stackCounter]
      buttonArray.forEach( button => {
        button.on('pointerover', ()=>this.hover());
        button.on('pointerout', ()=>this.unhover());
      })

      this.rotateButton.on('dragstart', ()=> this.dragStart())
      this.rotateButton.on('drag', (ptr)=>this.spin(ptr));
      this.rotateButton.on('dragend', (ptr)=> {
        this.afterSpin = true;
        this.dragEnd(ptr)
      });
      this.flipButton.on('pointerdown',()=>this.startFlip())
      this.flipButton.on('pointerup',()=>this.flip())

      this.shuffleButton.on('pointerup', ()=>this.shuffle())

    //card status variables
    this.cardNumber = cardNumber;
    this.startFlipClickedDown = false;
    this.revealed = false;
    this.spinning = false;
    this.otherPlayerDragging = false;
    this.addToHand = false;
    this.inHand = false;
    this.playerPickedUp = false;
    this.afterSpin = false;
    //this.stackNumber should always be the number of the card at the bottom of a given stack.
    //I.e., card 5 is stacked on card 18, and card 19 is stacked on card 5, all 3 cards will have stackNumber of 18.
    this.stackNumber = cardNumber
    //stackOrder is the number of cards from the bottom.
    //in example above, card18.stackOrder = 1, card5.stackOrder = 2, card19.stackOrder = 3.
    this.stackOrder = 1

    //overwrite phaser's bullshit toJSON implementation
    this.toJSON = () => {
      return {
        cardNumber: this.cardNumber,
        x: this.x,
        y: this.y,
        rotation: this.rotation,
        revealed: this.revealed,
        velocity: this.body.velocity,
        otherPlayerDragging: this.otherPlayerDragging,
        inHand: this.inHand,
        player: this.playerNumber,
        stackNumber: this.stackNumber,
        stackOrder: this.stackOrder,
        depth: this.depth
      }
    }
  }

  getCardsInStack(stackNumber = this.stackNumber) {

    let cardsInStack = []
    for (let cardNumber in this.gameState.cards) {
      let card = this.gameState.cards[cardNumber]
      if (card.stackNumber === stackNumber) cardsInStack.push(card)
    }

    //sort function just sorts by stack order
    return cardsInStack.sort( (a,b) => a.stackOrder - b.stackOrder)

  }

  giveNextStackNumber(stackNumber = this.stackNumber) {
    return this.getCardsInStack(stackNumber).length + 1
  }

  getClosestCardNotInStack() {
    const roomCards = Object.keys(this.gameState.cards).filter(key => Number(key) !== this.cardNumber && this.gameState.cards[key].stackNumber !== this.stackNumber).map( key => this.gameState.cards[key])
    return this.scene.physics.closest(this, roomCards)
  }

  dragStart(unhoverOldStack = false) {
    if(!this.otherPlayerDragging) this.playerPickedUp = true
    if (unhoverOldStack) this.unhover(null, this.cardNumber);
    this.glow.setVisible(true)
  }

  drag ({ worldX: dragX, worldY: dragY }, dragStack = false) {
    if (!dragStack) {
      this.stackNumber = this.cardNumber;
      this.stackOrder = 1;
      this.showCounter(0)
    }

    if(!this.playerPickedUp) return
    this.setDepth(activeDepth)
    this.glow.setVisible(true)
    //if a card is in your hand
    if (this.inHand) {

      //lock it to the bottom
      switch(this.playerNumber) {
        case 2:
          this.y = dragY < 0 ? 0 : dragY > 800 ? 800 : dragY;
          this.x = canvasWidth + inHandAdjustment;
          break;
        case (3):
          this.x = dragX < 0 ? 0 : dragX > 800 ? 800 : dragX;
          this.y = 0 - inHandAdjustment;
          break;
        case 4:
          this.y = dragY < 0 ? 0 : dragY > 800 ? 800 : dragY;
          this.x = 0 - inHandAdjustment;
          break;
        default:
          this.x = dragX < 0 ? 0 : dragX > 800 ? 800 : dragX;
          this.y = canvasHeight + inHandAdjustment;
          break;
      }
      //unless it is being removed from the hand
      if (!this.addToHand) {
        this.inHand = false;
        this.body.setCollideWorldBounds(true);
        this.gameState.cards[this.cardNumber] = this;
        delete this.gameState.hands[`player${this.playerNumber}`][this.cardNumber];

        this.socket.emit('removeCardFromHand', {card: this, room: this.gameState.room, player: `player${this.playerNumber}`});
      }
    } else {
      let dx = 0
      let dy = 0
      const { dragHistory } = this
      dragHistory.push([dragX, dragY]);
      if(dragHistory.length > 2) {
        dragHistory.shift()
        const [lastX, lastY] = dragHistory[1];
        const [penX, penY] = dragHistory[0];
        dx = (lastX - penX);
        dy = (lastY - penY);
      }
      this.getCardsInStack().forEach( card => {
        card.x += dx;
        card.y += dy;
        this.socket.emit('sendCard', { card, room: this.gameState.room, otherPlayerDragging: true });
      });
    }

    switch(this.playerNumber) {
      case 2:
        this.addToHand = dragX > canvasWidth - inHandRange;
        break;
      case (3):
        this.addToHand = dragY < inHandRange;
        break;
      case 4:
        this.addToHand = dragX < inHandRange;
        break;
      default:
        this.addToHand = dragY > canvasHeight - inHandRange;
        break;
    }

    this.otherPlayerDragging = false
  }

  dragEnd() {
    if(!this.playerPickedUp) return

    const closestCard = this.getClosestCardNotInStack();
    const distanceToClosestCard = closestCard && Math.sqrt(Math.pow((this.x - closestCard.x),2) + Math.pow((this.y - closestCard.y),2))

    if (distanceToClosestCard && distanceToClosestCard < magnetRadius) {
      this.getCardsInStack().forEach( card => {
        card.body.setVelocity(0,0);
        card.x = closestCard.x;
        card.y = closestCard.y;
        card.rotation = closestCard.rotation;
        card.stackOrder = this.giveNextStackNumber(closestCard.stackNumber);
        card.stackNumber = closestCard.stackNumber;
      })
    }
    else {
      if(!this.spinning && this.dragHistory.length > 1 && !this.addToHand && !this.inHand) {
        const { dragHistory } = this
        const [lastX, lastY] = dragHistory[dragHistory.length - 1];
        const [penX, penY] = dragHistory[dragHistory.length - 2];
        const dx = (lastX - penX) * 50;
        const dy = (lastY - penY) * 50;
        this.getCardsInStack().forEach( card => {
          card.body.setVelocity(dx, dy);
        })
      }
    }
    //if addToHand flag is active, and the card is not a mutliple stack
    if (this.addToHand && !this.inHand && this.getCardsInStack().length === 1) {
      this.gameState.hands[`player${this.playerNumber}`][this.cardNumber] = this;
      delete this.gameState.cards[this.cardNumber];
      this.inHand = true;
      this.setRotation((4 * (Math.PI/2)) - ((this.playerNumber - 1) * (Math.PI/2)));
      this.body.setCollideWorldBounds(false);
      switch(this.playerNumber) {
        case 2:
          this.x = canvasWidth + inHandAdjustment;
          break;
        case (3):
          this.y = 0 - inHandAdjustment;
          break;
        case 4:
          this.x = 0 - inHandAdjustment;
          break;
        default:
          this.y = canvasHeight + inHandAdjustment;
          break;
      }
      this.setDepth(cardDepth);
      this.socket.emit('addCardToHand', {card: this, room: this.gameState.room, player: `player${this.playerNumber}`});
    }
    else if (this.inHand) {
      //needs to be called explicity (and not sent on socket) because not part of game scene anymore
      this.setDepth(cardDepth)
    }

    this.getCardsInStack().forEach( (card,ix) => {
      card.dragHistory = [];
      card.setDepth(cardDepth + card.stackOrder)
      console.log('card spinning becoming false!')
      card.spinning = false;
      this.socket.emit('sendCard' , { card, room: this.gameState.room, otherPlayerDragging: false })
      this.playerPickedUp = false;
      card.showCounter(ix)
    })
  }

  hover () {
    if(this.otherPlayerDragging) return
    this.glow.setVisible(true)
    this.getCardsInStack().forEach( card => {
      card.flipButton.setVisible(true)
      card.rotateButton.setVisible(true)
      card.shuffleButton.setVisible(true)
      card.stackCounter.setPosition(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2)
    })
  }

  unhover (ptr, cardNumberToExclude = undefined) {
    if (this.afterSpin) {
      this.getCardsInStack().forEach( card => {
        card.afterSpin = false;
      })
      return;
    }
    if(!this.spinning) {
      this.glow.setVisible(false)
      this.getCardsInStack().forEach( card => {
        if (card.cardNumber !== cardNumberToExclude) {
          card.flipButton.setVisible(false)
          card.rotateButton.setVisible(false)
          card.shuffleButton.setVisible(false)
          card.stackCounter.setPosition(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2)
        }
      })
    }
  }

  spin(ptr) {

    this.getCardsInStack().forEach( card => {
      card.setDepth(activeDepth + card.stackOrder)
      card.spinning = true
      //some trig to spin the card relative to the pointer position
      card.rotation = Phaser.Math.Angle.Between(card.x, card.y, ptr.worldX, ptr.worldY) - 3*Math.PI/4
      this.socket.emit('sendCard', { card, room: this.gameState.room });
    })


  }

  startFlip() {
    if(this.otherPlayerDragging) return
    if (this.inHand) {
      this.setDepth(activeDepth);
      this.startFlipClickedDown = true;
    }
    else {
      this.getCardsInStack().forEach( card => {
        card.setDepth(activeDepth + card.stackOrder)
      //mark that a click down (without drag) begins in the reveal zone
        card.startFlipClickedDown = true
      })
    }
  }

  flip() {
    if(this.otherPlayerDragging) return
    let stackSizePlusOne = this.giveNextStackNumber();
    let newStackNumber = this.cardNumber;
    if (this.inHand) {
      if(this.startFlipClickedDown) {
        this.revealed ? this.card.setFrame(cardBackFrame) : this.card.setFrame(this.cardNumber)
        this.revealed = !this.revealed
      }
      this.startFlipClickedDown = false
      this.setDepth(cardDepth)
    }
    else {
      this.getCardsInStack().forEach( card => {
        if(card.startFlipClickedDown) {
          card.revealed ? card.card.setFrame(cardBackFrame) : card.card.setFrame(card.cardNumber)
          card.revealed = !card.revealed
        }
        card.startFlipClickedDown = false
        card.stackOrder = stackSizePlusOne - card.stackOrder;
        card.stackNumber = newStackNumber;
        card.setDepth(cardDepth + card.stackOrder)
        this.socket.emit('sendCard', { card, room: this.gameState.room });
      })
    }

  }

  setRevealed(_revealed) {
    this.revealed = _revealed
    !this.revealed ? this.card.setFrame(cardBackFrame) : this.card.setFrame(this.cardNumber)
  }

  showCounter(stackPosition) {
    this.stackCounter.setVisible(stackPosition > 0)
    this.count.setVisible(stackPosition > 0)
    this.count.setText(stackPosition + 1)
  }

  shuffle() {
    let arr = this.getCardsInStack()
    let shuffledDeck = shuffleDeck(arr)

    shuffledDeck.forEach( (card, ix, arr) => {
      card.stackNumber = arr[0].cardNumber;
      card.stackOrder = ix + 1
      card.setDepth(cardDepth + card.stackOrder);
      card.showCounter(ix)
      this.socket.emit('sendCard', { card, room: this.gameState.room });
    })
  }

}
