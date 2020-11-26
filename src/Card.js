import Phaser from 'phaser'
import { angularDrag, boardDrag } from './PhysicsConstants'

export default class Card extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, physicsGroup, cardNumber){
    super(scene, x, y, 'cardSprite')

    //frame 52 is the back of a card
    this.setFrame(52)

    //add to phaser scene and to the cards physics group
    scene.add.existing(this);
    physicsGroup.add(this)

    //card physics settings
    this.setDamping(true);
    this.setDrag(boardDrag);
    this.setBounce(1,1)
    this.setCollideWorldBounds(true)
    this.setInteractive({draggable: true});
    this.dragHistory = []

    //card event listeners
    this.on('drag', (ptr,dragX,dragY)=>this.drag(ptr, dragX, dragY));
    this.on('dragend', this.dragEnd);
    this.on('pointerover', (ptr,localX,localY)=>this.hover(ptr,localX,localY))
    this.on('pointerout', (ptr)=>this.unhover(ptr))
    this.on('pointerdown', (ptr,localX,localY)=>this.startReveal(ptr,localX,localY))
    this.on('pointerup',(ptr,localX,localY)=>this.reveal(ptr,localX,localY))

    //card status variables
    this.cardNumber = cardNumber;
    this.dragging = false
    this.spinning = false
    this.clickReveal = false
    this.revealed = false
  }

  drag (ptr, dragX, dragY) {
    //get bottom left corner and check if drag action begins within 50 pixels of it to spin rather than drag card
    const bottomLeft = this.getBottomLeft()
    if(Phaser.Math.Distance.BetweenPoints(bottomLeft, {x:ptr.downX, y: ptr.downY}) <= 50) {
      this.spinning = true
    }
    //do the same to check if click to begin to reveal card
    const topRight = this.getTopRight()
    if(Phaser.Math.Distance.BetweenPoints(topRight, {x:ptr.downX, y: ptr.downY}) <= 50) {
      this.clickReveal = true
    }
    //if spinning then apply rotation based on pointer position, otherwise drag
    if(this.spinning && !this.dragging) this.spin(ptr)
    else if(!this.clickReveal) {
      this.dragging = true
      //put the card on top of everything while dragging
      this.setDepth(2)
      const { dragHistory } = this
      dragHistory.push([dragX, dragY]);
      if(dragHistory.length > 2) {
        const [lastX, lastY] = dragHistory[dragHistory.length - 1];
        const [penX, penY] = dragHistory[dragHistory.length - 2];
        const dx = (lastX - penX) * 50;
        const dy = (lastY - penY) * 50;
        this.setVelocity(dx, dy);
      } else this.setVelocity(0,0)
      this.x = dragX;
      this.y = dragY;
    }
  }

  dragEnd (ptr) {
    if(this.dragging) {
      //put the card on top of the visible cards when you release
      this.setDepth(1)
      const { dragHistory } = this
      const [lastX, lastY] = dragHistory[dragHistory.length - 1];
      const [penX, penY] = dragHistory[dragHistory.length - 2];
      const dx = (lastX - penX) * 50;
      const dy = (lastY - penY) * 50;
      this.setVelocity(dx, dy);
      this.dragHistory = [];
    }
    this.dragging = false
    this.spinning = false

    //only reveal if drag begins and ends in the reveal zone
    const topRight = this.getTopRight()
    if(Phaser.Math.Distance.BetweenPoints(topRight, {x:ptr.upX, y: ptr.upY}) <= 50) {
      this.clickReveal = true
    } else this.clickReveal = false
  }

  hover (ptr,localX,localY) {
    //for now, this changes the frame of the card sprite
    //TODO:
    //instead of changing the frame, make some sprites appears on both revealed and unrevealed cards
    if(this.frame.name===52) this.setFrame(53)
  }

  unhover (ptr) {
    //TODO
    //make those temp sprites disappear
    if(this.frame.name===53) this.setFrame(52)
  }

  spin(ptr) {
    //some trig to spin the card relative to the pointer position
    this.rotation = Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY) - 3*Math.PI/4
  }

  startReveal(ptr, localX, localY) {
    //mark that a click (without drag) begins in the reveal zone
    const topRight = this.getTopRight()
    if(Phaser.Math.Distance.BetweenPoints(topRight, {x:ptr.downX, y: ptr.downY}) <= 50) {
      this.clickReveal = true
    }
  }

  reveal() {
    //reveal the card if the click began in the reveal zone, ends in reveal zone, and wasn't dragged/spun
    if(!this.dragging && !this.spinning && this.clickReveal) this.setFrame(this.cardNumber)
    this.clickReveal = false
    this.revealed = true
  }
}
