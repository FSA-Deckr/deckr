import Phaser from 'phaser'
import { boardDrag, cardDimensions, hoverButtonRadius, cardBackFrame, cardDepth, activeDepth, hoverOffset, canvasHeight, inHandAdjustment, canvasWidth, inHandRange } from './Constants'
export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, physicsGroup, cardNumber, orientation = Math.PI/2) {
    super(scene, x, y)
    //add images to container
    this.shadow = scene.add.image(0,0,'shadow')
    this.card = scene.add.sprite(0,0,'cardSprite')
    this.card.setFrame(cardBackFrame)
    this.flipButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius + hoverOffset, hoverButtonRadius - cardDimensions.height/2 - hoverOffset,'flip').setVisible(false)
    this.rotateButton = scene.add.image(hoverButtonRadius - cardDimensions.width/2 + hoverOffset, cardDimensions.height/2 - hoverButtonRadius - hoverOffset,'rotate').setVisible(false)
    this.shuffleButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius + hoverOffset, cardDimensions.height/2 - hoverButtonRadius - hoverOffset,'shuffle').setVisible(false)
    this.stackCounter = scene.add.image(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2,'deckCount').setVisible(true)
    // this.count = scene.add.text(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2, Number(10), { fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif', color: 'rgb(0, 0, 0)' }).setVisible(true)
    this.add([this.shadow,this.card,this.flipButton,this.rotateButton,this.shuffleButton,this.stackCounter])

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
      this.on('dragstart', () => this.dragStart(true))
      this.on('drag', (ptr,dragX,dragY)=>this.drag(ptr, dragX, dragY));
      this.on('dragend', this.dragEnd);
      this.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
      this.on('pointerout', (ptr)=>this.unhover(ptr))

      this.stackCounter.on('dragstart', ()=> this.dragStart())
      this.stackCounter.on('drag', (ptr,dragX,dragY)=> this.drag(ptr, ptr.worldX + 32.5, ptr.worldY + 77.5, true));
      this.stackCounter.on('dragend', () => this.dragEnd());

      const buttonArray = [this.rotateButton, this.flipButton, this.shuffleButton, this.stackCounter]
      buttonArray.forEach( button => {
        button.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY));
        button.on('pointerout', (ptr)=>this.unhover(ptr));
      })

      this.rotateButton.on('drag', (ptr,dragX,dragY)=>this.spin(ptr, dragX, dragY));
      this.rotateButton.on('dragend', (ptr)=>this.dragEnd(ptr));
      this.flipButton.on('pointerdown',()=>this.startFlip())
      this.flipButton.on('pointerup',()=>this.flip())

    //card status variables
    this.cardNumber = cardNumber;
    this.startFlipClickedDown = false;
    this.revealed = false;
    this.spinning = false;
    this.otherPlayerDragging = false;
    this.addToHand = false;
    this.inHand = false;
    this.playerPickedUp = false;
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
    return Object.keys(this.gameState.cards)
    .map( key => this.gameState.cards[key])
    .filter( card => card.stackNumber === stackNumber)
    .sort( (a,b) => a.stackOrder - b.stackOrder)
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
  }

  drag (ptr, dragX, dragY, dragStack = false) {
    if (!dragStack) {
      this.stackNumber = this.cardNumber;
      this.stackOrder = 1;
    }

    if(!this.playerPickedUp) return
    this.setDepth(activeDepth)

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
      const { dragHistory } = this
      dragHistory.push([dragX, dragY]);
      let newXv = 0;
      let newYv = 0;
      if(dragHistory.length > 2) {
        const [lastX, lastY] = dragHistory[dragHistory.length - 1];
        const [penX, penY] = dragHistory[dragHistory.length - 2];
        const dx = (lastX - penX) * 50;
        const dy = (lastY - penY) * 50;
        newXv = dx;
        newYv = dy;
      }
      this.getCardsInStack().forEach( card => {
        card.body.setVelocity(newXv, newYv)
        card.x = dragX;
        card.y = dragY;
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

    if (distanceToClosestCard && distanceToClosestCard < 20) {
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
      this.setRevealed(true);
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
      this.socket.emit('addCardToHand', {card: this, room: this.gameState.room, player: `player${this.playerNumber}`});
    }

    this.getCardsInStack().forEach( card => {
      card.dragHistory = [];
      card.setDepth(cardDepth + card.stackOrder)
      card.spinning = false;
      this.socket.emit('sendCard' , { card, room: this.gameState.room, otherPlayerDragging: false })
      this.playerPickedUp = false;
    })
  }

  hover (ptr,localX,localY) {
    if(this.otherPlayerDragging) return
    this.getCardsInStack().forEach( card => {
      card.flipButton.setVisible(true)
      card.rotateButton.setVisible(true)
      card.shuffleButton.setVisible(true)
      card.stackCounter.setPosition(hoverButtonRadius - cardDimensions.width/2 + hoverOffset, hoverButtonRadius - cardDimensions.height/2 - hoverOffset)
      card.card.setPosition(hoverOffset,-hoverOffset)
    })
  }

  unhover (ptr, cardNumberToExclude = undefined) {
    if(!this.spinning) {
      this.getCardsInStack().forEach( card => {
        if (card.cardNumber !== cardNumberToExclude) {
          card.flipButton.setVisible(false)
          card.rotateButton.setVisible(false)
          card.shuffleButton.setVisible(false)
          card.stackCounter.setPosition(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2)
          card.card.setPosition(0,0)
        }
      })
    }
  }

  spin(ptr) {
    this.setDepth(activeDepth)
    this.spinning = true
    //some trig to spin the card relative to the pointer position
    this.rotation = Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY) - 3*Math.PI/4
    this.socket.emit('sendCard', { card:this, room: this.gameState.room });
  }

  startFlip() {
    if(this.otherPlayerDragging) return
    this.setDepth(activeDepth)
    //mark that a click down (without drag) begins in the reveal zone
    this.startFlipClickedDown = true
  }

  flip() {
    if(this.otherPlayerDragging) return
    //flip
    if(this.startFlipClickedDown) {
      this.revealed ? this.card.setFrame(cardBackFrame) : this.card.setFrame(this.cardNumber)
      this.revealed = !this.revealed
    }
    this.startFlipClickedDown = false
    this.setDepth(activeDepth)
    this.socket.emit('sendCard', { card:this, room: this.gameState.room });
  }

  setRevealed(_revealed) {
    this.revealed = _revealed
    !this.revealed ? this.card.setFrame(cardBackFrame) : this.card.setFrame(this.cardNumber)
  }
}
