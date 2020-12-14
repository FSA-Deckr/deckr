//physics variables
export const angularSpeedFactor = .4
export const angularDrag = 1500
export const boardDrag = 0.85

//card and chip variables
export const chipRadius = 25
export const cardDimensions = {width:100, height:140}
export const hoverButtonRadius = 18
export const cardBackFrame = 52
export const hoverOffset = 10
export const inHandAdjustment = 15
export const inHandRange = 100
export const textOffset = 8
export const magnetRadius = 35;
export const collectionAnimationMilis = 300

//display z-index/depth variables
export const chipDepth = 1
export const cardDepth = 2
export const activeDepth = 100

//game board
export const canvasWidth = 800
export const canvasHeight = 800

//player chip and card placement and initial values
export const initialChips = 1000
export const chipNames = ['chip1','chip5','chip25','chip50','chip100','chip500']
export const newItemRange = 200
export const newItemRandom = 10
export const chipOffset = 65
export const cardOffset = 165
export const chipBankRange = 40

//player colors and semicircle positions
export const playerColors = {
  1:0xff1100,
  2:0x0400ff,
  3:0xff9d00,
  4:0x9500ff
}
const circleOffset = 40
export const semicircleOpacity = 0.25
export const playerSemicircles = [
  {x:canvasWidth / 2, y:canvasHeight + circleOffset}, //bottom = p1
  {x:canvasWidth + circleOffset, y:canvasHeight / 2}, //right = p2
  {x:canvasWidth / 2, y:0 - circleOffset}, //top = p3
  {x:0 - circleOffset, y:canvasHeight / 2}, //left = p4
]
export const semicircleRadius = 80
