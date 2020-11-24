import Phaser from 'phaser'

const cfg = {
  type: Phaser.AUTO,
  width: 800,
  height: 800,
  physics: {
    default: 'arcade',
    arcade: { debug: false}
  },
  scene: { preload, create }
}

//// physics constants, can keep this in a separate file later/////
const angularSpeedFactor = 1
const chipRadius = 25
const angularDrag = 500
const boardDrag = 0.92
////////////////////////////////////

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
    chip.setAngularVelocity(100)
    chip.setAngularDrag(angularDrag)
    chip.setDamping(true);
    chip.setDrag(boardDrag);
    chip.setBounce(1,1)
    chip.setCollideWorldBounds(true)
    chip.setInteractive();
    chip.setCircle(chipRadius,0,0);

    this.input.setDraggable(chip);
  }
  this.physics.add.collider(chips, chips, function(chipA, chipB) {
    const ax = chipA.body.x
    const ay = chipA.body.y
    const bx = chipB.body.x
    const by = chipB.body.y
    const contactAngle = Math.atan2(bx-ax, by-ay)

    const avx = chipA.body.velocity.x
    const avy = chipA.body.velocity.y
    const bvx = chipB.body.velocity.x
    const bvy = chipB.body.velocity.y

    const impulseAngle = Math.atan2(bvx-avx,bvy-avy)

    let spinCoeff = contactAngle - impulseAngle
    spinCoeff = ((spinCoeff + Math.PI) % (Math.PI*2) - Math.PI) / Math.PI
    const spinSpeed = Math.sqrt(((avx+bvx)**2) + ((avy+bvy)**2))
    chipA.setAngularVelocity(angularSpeedFactor * (spinCoeff) * spinSpeed * -1)
    chipB.setAngularVelocity(angularSpeedFactor * (spinCoeff) * spinSpeed)
  })
  function stopChips() {
    chips.children.iterate(function(chip){
      chip.storedVelX = chip.body.velocity.x
      chip.storedVelY = chip.body.velocity.y
      chip.setVelocity(0,0)
      chip.setAngularVelocity(0)
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
    chip.setAngularVelocity(0)
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

