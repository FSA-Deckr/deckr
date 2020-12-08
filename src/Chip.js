import Phaser from 'phaser'
import { angularDrag, boardDrag, chipRadius, chipDepth, activeDepth, chipBankRange, canvasHeight, canvasWidth, chipNames } from './Constants'

export default class Chip extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, physicsGroup, chipNumber, chipValue, orientation = 0){
    super(scene, x, y, 'chipSprite')
    //map chip values to sprite frame
    const chipValueMap = {1:0, 5:1, 25:2, 50:3, 100:4, 500:5}

    //phaser scene and physics
    scene.add.existing(this);
    physicsGroup.add(this)
    this.setFrame(chipValueMap[chipValue])
    this.setDepth(chipDepth)
    this.rotation = orientation

    //socket and room info for emit events
    this.gameState = scene.game.gameState;
    this.socket = scene.game.socket;
    this.playerNumber = scene.game.playerNumber

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
    this.chipValue = chipValue
    this.otherPlayerDragging = false
    this.playerPickedUp = false

    //overwrite phaser's bullshit toJSON implementation
    this.toJSON = () => {
      return {
        chipNumber: this.chipNumber,
        chipValue: this.chipValue,
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
    let addToBank
    switch(this.playerNumber) {
      case 2:
        addToBank = this.x > canvasWidth - chipBankRange;
        break;
      case (3):
        addToBank = this.y < chipBankRange
        break;
      case 4:
        addToBank = this.x < chipBankRange
        break;
      default:
        addToBank = this.y > canvasHeight - chipBankRange;
        break;
    }

    if(addToBank) {
      //add value to player bank
      this.scene.game.playerChipTotal += this.chipValue
      this.gameState.playerBanks[this.playerNumber] = this.scene.game.playerChipTotal
      playerChips.innerText = this.gameState.playerBanks[this.playerNumber]
      chipNames.forEach(chipName => {
        if(this.scene.game.playerChipTotal < +chipName.substring(4)) document.getElementById(chipName).className = 'greyOut chipImg'
        else document.getElementById(chipName).className = 'chipImg'
      })

      //emit player chip bank
      this.socket.emit('bankChip', {chipNumber: this.chipNumber, room: this.gameState.room, playerNumber: this.scene.game.playerNumber})

      //remove chip from board and GameState
      this.destroy()
      delete this.gameState.chips[this.chipNumber]

      ///////////////////////////////////////////////////////////////////
      //  for now, update playerBanks Div //////////////////////////////
      //////////////////////////////////////////////////////////////////
      playerBankDiv.innerHTML = `
      <p>Player 1 Bank: $ ${this.gameState.playerBanks[1]}</p>
      <p>Player 2 Bank: $ ${this.gameState.playerBanks[2]}</p>
      <p>Player 3 Bank: $ ${this.gameState.playerBanks[3]}</p>
      <p>Player 4 Bank: $ ${this.gameState.playerBanks[4]}</p>
      `
    } else {
      this.socket.emit('sendChip', { chip:this, room: this.gameState.room, otherPlayerDragging: false });
    }

    this.playerPickedUp = false
  }
}
