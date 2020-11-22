import Phaser from 'phaser'

const cfg = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  physics: {
    default: 'arcade'
  },
  scene: { preload, create }
}

const game = new Phaser.Game(cfg)

function preload() {
  this.load.image('chip','chip.png')
}

function create() {
  const chips = this.physics.add.group();

  for(let i = 0; i < 10; i++){
    const rX = Math.floor(Math.random() * 400) + 200
    const rY = Math.floor(Math.random() * 400) + 200
    const vX = Math.floor(Math.random() * 200) + 100
    const vY = Math.floor(Math.random() * 200) + 100
    const chip = chips.create(rX, rY, 'chip')
    chip.setVelocity(vX,vY)
    chip.setBounce(1,1)
    chip.setCollideWorldBounds(true)
  }
  this.physics.add.collider(chips)
}
