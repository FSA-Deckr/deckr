import Phaser from 'phaser'
import { boardDrag, cardDimensions, hoverButtonRadius, cardBackFrame, cardDepth, activeDepth, hoverOffset } from './Constants'
export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, physicsGroup, cardNumber) {
    super(scene, x, y)
    //add images to container
    this.shadow = scene.add.image(0,0,'shadow')
    this.card = scene.add.sprite(0,0,'cardSprite')
    this.card.setFrame(cardBackFrame)
    this.flipButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius + hoverOffset, hoverButtonRadius - cardDimensions.height/2 - hoverOffset,'flip').setVisible(false)
    this.rotateButton = scene.add.image(hoverButtonRadius - cardDimensions.width/2 + hoverOffset, cardDimensions.height/2 - hoverButtonRadius - hoverOffset,'rotate').setVisible(false)
    this.shuffleButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius + hoverOffset, cardDimensions.height/2 - hoverButtonRadius - hoverOffset,'shuffle').setVisible(false)
    this.stackCounter = scene.add.image(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2,'deckCount').setVisible(true).setDepth(3)
    this.count = scene.add.text(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2, Number(10), { fontFamily: 'Georgia, "Goudy Bookletter 1911", Times, serif', color: 'rgb(0, 0, 0)' }).setVisible(true).setDepth(5)
    this.add([this.shadow,this.card,this.count,this.flipButton,this.rotateButton,this.shuffleButton,this.stackCounter])

    //socket and room info for emit events
    this.gameState = scene.game.gameState;
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

    //event listeners
    this.dragHistory = []
    this.on('dragstart', this.dragStart)
    this.on('drag', (ptr, dragX, dragY) => this.drag(ptr, dragX, dragY));
    this.on('dragend', this.dragEnd);
    this.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.on('pointerout', (ptr)=>this.unhover())
    this.rotateButton.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.rotateButton.on('pointerout', (ptr)=>this.unhover())
    this.rotateButton.on('drag', (ptr,dragX,dragY)=>this.spin(ptr, dragX, dragY));
    this.rotateButton.on('dragend', (ptr)=>this.dragEnd(ptr));
    this.flipButton.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.flipButton.on('pointerout', (ptr)=>this.unhover())
    this.flipButton.on('pointerdown',()=>this.startFlip())
    this.flipButton.on('pointerup',()=>this.flip())
    this.stackCounter.on('dragstart', this.dragStart)
    this.stackCounter.on('drag', (ptr, dragX, dragY) => this.drag(ptr, dragX, dragY, true))
    this.stackCounter.on('dragend', this.dragEnd);
    this.stackCounter.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.stackCounter.on('pointerout', (ptr)=>this.unhover())


    //card status variables
    this.cardNumber = cardNumber;
    this.startFlipClickedDown = false
    this.revealed = false
    this.spinning = false
    this.otherPlayerDragging = false
    this.playerPickedUp = false
    //this.stackNumber should always be the number of the card at the bottom of a given stack. 
    //I.e., card 5 is stacked on card 18, and card 19 is stacked on card 5, all 3 cards will have stackNumber of 18.
    this.stackNumber = this.cardNumber
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
        stackNumber: this.stackNumber,
        stackOrder: this.stackOrder
      }
    }
  }

  getCardsInStack() {
    return Object.keys(this.gameState.cards).map( key => this.gameState.cards[key]).filter( card => card.stackNumber === this.stackNumber)
  }
  
  giveNextStackNumber() {
    return this.getCardsInStack().length + 1
  }

  dragStart() {
    console.log('getting in the dragStart... should get true', !this.otherPlayerDragging)
    if(!this.otherPlayerDragging) this.playerPickedUp = true
    console.log(this.playerPickedUp)
  }

  drag (ptr, dragX, dragY, dragStack = false) {
    console.log('we are getting in with drag stack eq to ', dragStack, this.playerPickedUp, 'hopefully true');
    if(!this.playerPickedUp) return
    this.setDepth(activeDepth)
    const { dragHistory } = this
    dragHistory.push([dragX, dragY]);
    let newXv, newYv;
    if(dragHistory.length > 2) {
      const [lastX, lastY] = dragHistory[dragHistory.length - 1];
      const [penX, penY] = dragHistory[dragHistory.length - 2];
      const dx = (lastX - penX) * 50;
      const dy = (lastY - penY) * 50;
      newXv = dx;
      newYv = dy;
    } else {
      newXv = 0;
      newYv = 0;
    }

    if (dragStack) {
      console.log('at least in the stack', this.getCardsInStack(), this.gameState.cards)
      this.getCardsInStack().forEach( card => {
        console.log('getting in the dra', card.cardNumber, newXv, newYv, dragX, dragY);
        card.body.setVelocity(newXv, newYv);
        card.x = dragX;
        card.y = dragY;
        this.socket.emit('sendCard', { card, room: this.gameState.room, otherPlayerDragging: true });
      })
    } else {
      this.body.setVelocity(newXv, newYv);
      this.x = dragX;
      this.y = dragY;
      this.socket.emit('sendCard', { card:this, room: this.gameState.room, otherPlayerDragging: true });
    }
    
    this.otherPlayerDragging = false
  }

  dragEnd () {
    if(!this.playerPickedUp && !this.spinning) return

    //make array of each of the cards on the board
    console.log('is it even reading the gameState', this.gameState, this.scene.game.gameState);
    const roomCards = Object.keys(this.gameState.cards).filter(key => Number(key) !== this.cardNumber).map( key => this.gameState.cards[key])
    const closestCard = this.scene.physics.closest(this, roomCards)
    const distanceToClosestCard = closestCard && Math.sqrt(Math.pow((this.x - closestCard.x),2) + Math.pow((this.y - closestCard.y),2))

    if (distanceToClosestCard && distanceToClosestCard < 20) {
      this.body.setVelocity(0,0);
      this.x = closestCard.x;
      this.y = closestCard.y;
      this.rotation = closestCard.rotation;
      this.stackNumber = closestCard.stackNumber;
      this.stackOrder = this.giveNextStackNumber();
      this.setDepth(cardDepth + this.stackOrder)
      this.unhover();
    }
    else {
      if(!this.spinning && this.dragHistory.length > 1) {
        const { dragHistory } = this
        const [lastX, lastY] = dragHistory[dragHistory.length - 1];
        const [penX, penY] = dragHistory[dragHistory.length - 2];
        const dx = (lastX - penX) * 50;
        const dy = (lastY - penY) * 50;
        this.body.setVelocity(dx, dy);
        this.dragHistory = [];
      }
      this.stackNumber = this.cardNumber;
      this.stackOrder = 1;
      this.setDepth(cardDepth)
      
    }
    this.spinning = false

    this.socket.emit('sendCard', { card:this, room: this.gameState.room, otherPlayerDragging: false });
    console.log('it IS down here');
    this.playerPickedUp = false
  }

  hover (ptr,localX,localY) {
    if(this.otherPlayerDragging) return
    this.getCardsInStack().forEach( card => {
      card.flipButton.setVisible(true)
      card.rotateButton.setVisible(true)
      card.shuffleButton.setVisible(true)
      card.count.setPosition(hoverButtonRadius - cardDimensions.width/2 + hoverOffset, hoverButtonRadius - cardDimensions.height/2 - hoverOffset)
      card.stackCounter.setPosition(hoverButtonRadius - cardDimensions.width/2 + hoverOffset, hoverButtonRadius - cardDimensions.height/2 - hoverOffset)
      card.card.setPosition(hoverOffset,-hoverOffset)
    })

  }

  unhover () {
    if(!this.spinning) {
      this.getCardsInStack().forEach( card => {
        card.flipButton.setVisible(false)
        card.rotateButton.setVisible(false)
        card.shuffleButton.setVisible(false)
        card.count.setPosition(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2)
        card.stackCounter.setPosition(hoverButtonRadius - cardDimensions.width/2, hoverButtonRadius - cardDimensions.height/2)
        card.card.setPosition(0,0)
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
    this.setDepth(cardDepth)
    this.socket.emit('sendCard', { card:this, room: this.gameState.room });
  }

  setRevealed(_revealed) {
    this.revealed = _revealed
    !this.revealed ? this.card.setFrame(cardBackFrame) : this.card.setFrame(this.cardNumber)
  }
}
