import Phaser from 'phaser'
import { boardDrag, cardDimensions, hoverButtonRadius, cardBackFrame, cardDepth, activeDepth } from './Constants'
export default class Card extends Phaser.GameObjects.Container {
  constructor(scene, x, y, physicsGroup, cardNumber) {
    super(scene, x, y)
    //add images to container
    this.card = scene.add.sprite(0,0,'cardSprite')
    this.card.setFrame(cardBackFrame)
    this.flipButton = scene.add.image(cardDimensions.width/2 - hoverButtonRadius, hoverButtonRadius - cardDimensions.height/2,'flip').setVisible(false)
    this.rotateButton = scene.add.image(hoverButtonRadius - cardDimensions.width/2, cardDimensions.height/2 - hoverButtonRadius,'rotate').setVisible(false)
    this.add([this.card,this.flipButton,this.rotateButton])

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
  }

  drag (ptr, dragX, dragY) {
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
  }

  dragEnd (ptr) {
    if(!this.spinning) {
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
  }

  hover (ptr,localX,localY) {
    this.flipButton.setVisible(true)
    this.rotateButton.setVisible(true)
  }

  unhover (ptr) {
    if(!this.spinning) {
      this.flipButton.setVisible(false)
      this.rotateButton.setVisible(false)
    }
  }

  spin(ptr) {
    this.setDepth(activeDepth)
    this.spinning = true
    //some trig to spin the card relative to the pointer position
    this.rotation = Phaser.Math.Angle.Between(this.x, this.y, ptr.worldX, ptr.worldY) - 3*Math.PI/4
  }

  startFlip() {
    this.setDepth(activeDepth)
    //mark that a click down (without drag) begins in the reveal zone
    this.startFlipClickedDown = true
  }

  flip() {
    //flip
    if(this.startFlipClickedDown) {
      this.revealed ? this.card.setFrame(cardBackFrame) : this.card.setFrame(this.cardNumber)
      this.revealed = !this.revealed
    }
    this.startFlipClickedDown = false
    this.setDepth(cardDepth)
  }
}
