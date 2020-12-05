import Phaser from 'phaser'
import { boardDrag, cardDimensions, hoverButtonRadius, cardBackFrame, cardDepth, activeDepth, hoverOffset, canvasHeight } from './Constants'
export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, physicsGroup, cardNumber) {
    super(scene, x, y)
    //add images to container
    this.shadow = scene.add.image(0,0,'shadow')
    this.card = scene.add.sprite(0,0,'cardSprite')
    this.card.setFrame(cardBackFrame)
    this.flipButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius + hoverOffset, hoverButtonRadius - cardDimensions.height/2 - hoverOffset,'flip').setVisible(false)
    this.rotateButton = scene.add.image(hoverButtonRadius - cardDimensions.width/2 + hoverOffset, cardDimensions.height/2 - hoverButtonRadius - hoverOffset,'rotate').setVisible(false)
    this.add([this.shadow,this.card,this.flipButton,this.rotateButton])

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

    //make card interact w physics
    physicsGroup.add(this)
    this.body.setDrag(boardDrag);
    this.body.useDamping = true;
    this.body.setBounce(1,1)
    this.body.setCollideWorldBounds(true)

    //event listeners
    this.dragHistory = []
    this.on('dragstart', this.dragStart)
    this.on('drag', (ptr,dragX,dragY)=>this.drag(ptr, dragX, dragY));
    this.on('dragend', this.dragEnd);
    this.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.on('pointerout', (ptr)=>this.unhover(ptr))
    this.rotateButton.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.rotateButton.on('pointerout', (ptr)=>this.unhover(ptr))
    this.rotateButton.on('drag', (ptr,dragX,dragY)=>this.spin(ptr, dragX, dragY));
    this.rotateButton.on('dragend', (ptr)=>this.dragEnd(ptr));
    this.flipButton.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.flipButton.on('pointerout', (ptr)=>this.unhover(ptr))
    this.flipButton.on('pointerdown',()=>this.startFlip())
    this.flipButton.on('pointerup',()=>this.flip())

    //card status variables
    this.cardNumber = cardNumber;
    this.startFlipClickedDown = false
    this.revealed = false
    this.spinning = false
    this.otherPlayerDragging = false
    this.playerPickedUp = false
    this.addToHand = false;

    //overwrite phaser's bullshit toJSON implementation
    this.toJSON = () => {
      return {
        cardNumber: this.cardNumber,
        x: this.x,
        y: this.y,
        rotation: this.rotation,
        revealed: this.revealed,
        velocity: this.body.velocity,
        otherPlayerDragging: this.otherPlayerDragging
      }
    }
  }

  dragStart() {
    if(!this.otherPlayerDragging) this.playerPickedUp = true
  }

  drag (ptr, dragX, dragY) {
    if(!this.playerPickedUp) return
    this.setDepth(activeDepth)
    const { dragHistory } = this
    dragHistory.push([dragX, dragY]);
    if(dragHistory.length > 2) {
      const [lastX, lastY] = dragHistory[dragHistory.length - 1];
      const [penX, penY] = dragHistory[dragHistory.length - 2];
      const dx = (lastX - penX) * 50;
      const dy = (lastY - penY) * 50;
      this.body.setVelocity(dx, dy);
    } else this.body.setVelocity(0,0)
    this.x = dragX;
    this.y = dragY;

    //this is when we want to add to hand
    if (this.y > canvasHeight - 100) {
      //set a add to hand value to true, to check on dragEnd
      this.addToHand = true;
      //animate/indicate that we are in this state, pointer change, etc.
    } else {
      this.addToHand = false;
    }
    console.log("Add to hand?", this.addToHand);

    this.socket.emit('sendCard', { card:this, room: this.gameState.room, otherPlayerDragging: true });
    this.otherPlayerDragging = false
  }

  dragEnd () {
    if(!this.playerPickedUp) return
    if(!this.spinning && this.dragHistory.length > 1) {
      const { dragHistory } = this
      const [lastX, lastY] = dragHistory[dragHistory.length - 1];
      const [penX, penY] = dragHistory[dragHistory.length - 2];
      const dx = (lastX - penX) * 50;
      const dy = (lastY - penY) * 50;
      this.body.setVelocity(dx, dy);
      this.dragHistory = [];
    }
    this.spinning = false
    this.setDepth(cardDepth)

    this.socket.emit('sendCard', { card:this, room: this.gameState.room, otherPlayerDragging: false });
    this.playerPickedUp = false

    if (this.addToHand) {
      this.gameState.hands[`player1`].push(this.cardNumber);
      console.log(this.gameState.hands);
      this.socket.emit('destroyCard', {cardNumber: this.cardNumber, room: this.gameState.room, player: 'player1'});
      p1Card.innerText = this.gameState.hands.player1.length;
      this.destroy();
      delete this.gameState.cards[this.cardNumber];
    }
  }

  hover (ptr,localX,localY) {
    if(this.otherPlayerDragging) return
    this.flipButton.setVisible(true)
    this.rotateButton.setVisible(true)
    this.card.setPosition(hoverOffset,-hoverOffset)
  }

  unhover (ptr) {
    if(!this.spinning) {
      this.flipButton.setVisible(false)
      this.rotateButton.setVisible(false)
      this.card.setPosition(0,0)
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
