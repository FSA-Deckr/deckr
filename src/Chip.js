import Phaser from 'phaser'
import { angularDrag, boardDrag, chipRadius } from './PhysicsConstants'

export default class Chip extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y, physicsGroup){
    super(scene, x, y, 'chip')
    //phaser scene and physics
    scene.add.existing(this);
    physicsGroup.add(this)

    //phaser physics settings
    this.setAngularDrag(angularDrag)
    this.setDamping(true);
    this.setDrag(boardDrag);
    this.setBounce(1,1)
    this.setCollideWorldBounds(true)
    this.setInteractive({draggable: true});
    this.setCircle(chipRadius,0,0);
    this.dragHistory = []

    //chip event listeners
    this.on('drag', (ptr,dragX,dragY)=>this.drag(ptr, dragX, dragY));
    this.on('dragend', this.dragEnd);
  }

  drag (ptr, dragX, dragY) {
    //put chips on top while dragging
    this.setDepth(2)
    const { dragHistory } = this
      this.setAngularVelocity(0)
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

  dragEnd (ptr) {
    //put chip back on bottom layer when done dragging
    this.setDepth(0)
    const { dragHistory } = this
    const [lastX, lastY] = dragHistory[dragHistory.length - 1];
    const [penX, penY] = dragHistory[dragHistory.length - 2];
    const dx = (lastX - penX) * 50;
    const dy = (lastY - penY) * 50;
    this.setVelocity(dx, dy);
    this.dragHistory = [];
  }
}
