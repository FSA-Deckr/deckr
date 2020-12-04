import Phaser from 'phaser'
import { angularDrag, boardDrag, chipRadius, chipDepth, activeDepth } from './Constants'

export default class Chip extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y, physicsGroup, chipNumber){
    super(scene, x, y, 'chip')
    //phaser scene and physics
    scene.add.existing(this);
    physicsGroup.add(this)
    this.setDepth(chipDepth)

    //socket and room info for emit events
    this.gameState = scene.game.gameState;
    this.socket = scene.game.socket;

    //phaser physics settings
    this.setAngularDrag(angularDrag)
    this.setDamping(true);
    this.setDrag(boardDrag);
    this.setBounce(1,1)
    this.setCollideWorldBounds(true)
    this.setInteractive({draggable: true});
    this.setCircle(chipRadius,0,0);
    this.dragHistory = []

    //socket and room info for emit events
    this.gameState = scene.game.gameState;
    this.socket = scene.game.socket;

    //chip event listeners
    this.on('dragstart', this.dragStart)
    this.on('drag', (ptr,dragX,dragY)=>this.drag(ptr, dragX, dragY));
    this.on('dragend', this.dragEnd);

    //chip status variables
    this.chipNumber = chipNumber
    this.otherPlayerDragging = false
    this.playerPickedUp = false

    //overwrite phaser's bullshit toJSON implementation
    this.toJSON = () => {
      return {
        chipNumber: this.chipNumber,
        x: this.x,
        y: this.y,
        rotation: this.rotation,
        velocity: this.body.velocity,
        angularVelocity: this.body.angularVelocity,
        otherPlayerDragging: this.otherPlayerDragging
      }
    }
  }

  dragStart() {
    if(!this.otherPlayerDragging) this.playerPickedUp = true
  }

  drag (ptr, dragX, dragY) {
    if(!this.playerPickedUp) return
    //put chips on top while dragging
    this.setDepth(activeDepth)
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

    this.socket.emit('sendChip', { chip:this, room: this.gameState.room, otherPlayerDragging: true });
    this.otherPlayerDragging = false
  }

  dragEnd (ptr) {
    if(!this.playerPickedUp) return
    //put chip back on bottom layer when done dragging
    this.setDepth(chipDepth)
    const { dragHistory } = this
    const [lastX, lastY] = dragHistory[dragHistory.length - 1];
    const [penX, penY] = dragHistory[dragHistory.length - 2];
    const dx = (lastX - penX) * 50;
    const dy = (lastY - penY) * 50;
    this.setVelocity(dx, dy);
    this.dragHistory = [];

    this.socket.emit('sendChip', { chip:this, room: this.gameState.room, otherPlayerDragging: false });
    this.playerPickedUp = false
  }
}
