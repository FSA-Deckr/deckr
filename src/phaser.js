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

const stop = document.getElementById('stop')
const start = document.getElementById('start')
const game = new Phaser.Game(cfg)
let chips

function preload() {
  this.load.image('chip','chip.png')
}

function create() {
  chips = this.physics.add.group({
    storedVelX: 0,
    storedVelY: 0
  });

  for(let i = 0; i < 10; i++){
    const rX = Math.floor(Math.random() * 400) + 200
    const rY = Math.floor(Math.random() * 400) + 200
    const vX = 400 - Math.floor(Math.random() * 800)
    const vY = 400 - Math.floor(Math.random() * 800)
    const chip = chips.create(rX, rY, 'chip')
    chip.setVelocity(vX,vY)
    chip.setDamping(true);
    chip.setDrag(0.98, 0.98);
    chip.setBounce(1,1)
    chip.setCollideWorldBounds(true)
    chip.setInteractive();
    this.input.setDraggable(chip);
  }
  this.physics.add.collider(chips)
  function stopChips() {
    chips.children.iterate(function(chip){
      chip.storedVelX = chip.body.velocity.x
      chip.storedVelY = chip.body.velocity.y
      chip.setVelocity(0,0)
    })
  }
  function startChips() {
    chips.children.iterate(function(chip){
      chip.setVelocity(chip.storedVelX,chip.storedVelY)
      chip.storedVelX = 0
      chip.storedVelY = 0
    })
  }
  stop.onclick = stopChips
  start.onclick = startChips
  let dragHistory = [];

  this.input.on('drag', (function (pointer, chip, dragX, dragY) {
    dragHistory.push([dragX, dragY]);
    if(dragHistory.length > 2) {
      const [lastX, lastY] = dragHistory[dragHistory.length - 1];
      const [penX, penY] = dragHistory[dragHistory.length - 2];
      const dx = (lastX - penX) * 50;
      const dy = (lastY - penY) * 50;
      chip.setVelocity(dx, dy);
    } else chip.setVelocity(0,0)
    chip.x = dragX;
    chip.y = dragY;
  }));

  this.input.on('dragend', function(pointer, gameObject){
    const [lastX, lastY] = dragHistory[dragHistory.length - 1];
    const [penX, penY] = dragHistory[dragHistory.length - 2];
    const dx = (lastX - penX) * 50;
    const dy = (lastY - penY) * 50;
    gameObject.setVelocity(dx, dy);
    dragHistory = [];
  });
}

