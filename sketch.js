/**
 * Kingyobachi, Roh Woohyeon
 *
 * Final Presentation (Intro to Creative Computing)
 * © 2019 All Rights Reserved
 */

/* Define constants */
const BACKGROUND_COLOR = 0
const FRAME_RATE = 40
const FISH = []
const NUM_DOTS = 100
const NUM_FISH = 1
const FISH_SIZE = 50

/* Setup canvas */
function setup() {
  createCanvas(windowWidth, windowHeight)
  colorMode(p5.HSB, 100)
  frameRate(FRAME_RATE)

  for (let i = 0; i < NUM_FISH; i++) {
    let size = FISH_SIZE + random(10)
    FISH.push(
      new Fish({
        position: new p5.Vector(random(windowWidth), random(windowHeight)),
        length: size * 3.5,
        width: size,
        numSegments: 20,
        maxAvoidanceForce: 10,
        maxAvoidanceSpeed: map(i, 0, NUM_FISH - 1, 8, 10),
        maxMovementForce: map(i, 0, NUM_FISH - 1, 0.1, 0.2),
        maxMovementSpeed: map(i, 0, NUM_FISH - 1, 2, 3),
        wiggleFactor: 0.5
      })
    )
  }
}

/* Draw fish */
function draw() {
  // Set default background color
  background(BACKGROUND_COLOR)

  // Generate glitch in background
  for (let i = 0; i < NUM_DOTS; i++) {
    let x1 = Math.random() * windowWidth
    let y1 = Math.random() * windowHeight
    let theta = Math.random() * 2 * Math.PI
    let segmentLength = Math.random() * 5 + 2
    let x2 = Math.cos(theta) * segmentLength + x1
    let y2 = Math.sin(theta) * segmentLength + y1
    let strWeight = Math.random() * 2

    strokeWeight(strWeight)
    line(x1, y1, x2, y2)
    stroke(
      100,
      255 - Math.random() * 5,
      230 - Math.random() * 8,
      Math.random() * 10 + 75
    )
  }

  // Generate fish
  for (let i = 0; i < FISH.length; i++) {
    if (!(FISH[i].moveToTarget instanceof p5.Vector)) {
      FISH[i].moveToVector(
        new p5.Vector(random(windowWidth), random(windowHeight))
      )
    }

    FISH[i].avoidFish(FISH, map(i, 0, FISH.length - 1, 3, 10))
    FISH[i].update()
    FISH[i].draw()
  }
}

/* mouseMoved Interaction */
function mouseMoved() {
  for (let i = 0; i < FISH.length; i++) {
    // Fish follows mouse
    FISH[i].moveToVector(new p5.Vector(mouseX, mouseY))
  }
}

/* FishSegment Class */
class FishSegment {
  constructor(options) {
    const { x, y, angle, child, color, length, parent, width } = options
    // Calculate anchor end vector and update
    this.calculateAnchorEnd = () => {
      let x = this.anchorStart.x
      let y = this.anchorStart.y
      let dx = this.length * cos(this.angle)
      let dy = this.length * sin(this.angle)

      this.anchorEnd.set(x + dx, y + dy)
    }

    // Retrieve last child segment
    this.getLastChild = () => {
      return this.child !== null ? this.child.getLastChild() : this
    }

    this.anchorEnd = new p5.Vector(0, 0)
    this.anchorStart = new p5.Vector(x ? x : 0, y ? y : 0)
    this.angle = radians(angle ? angle : 0)
    this.child = child ? child : null
    this.color = color ? color : color(255)
    this.length = length ? length : 0
    this.parent = parent ? parent : null
    this.width = width ? width : 1

    this.calculateAnchorEnd()
  }

  draw = () => {
    const { width, color, anchorStart, anchorEnd, child } = this

    strokeWeight(width)
    stroke(color)
    line(anchorStart.x, anchorStart.y, anchorEnd.x, anchorEnd.y)

    if (child) {
      child.draw()
    }
  }

  lastChild = () => {
    return this.getLastChild()
  }

  lookAtPoint = (x, y) => {
    let targetPoint = new p5.Vector(x, y)
    let direction = p5.Vector.sub(targetPoint, this.anchorStart)

    this.angle = direction.heading()
    direction.setMag(this.length)
    direction.mult(-1)
    this.anchorStart = targetPoint.add(direction)
    if (this.parent)
      this.parent.lookAtPoint(this.anchorStart.x, this.anchorStart.y)
  }

  update = () => {
    const { calculateAnchorEnd, child } = this

    calculateAnchorEnd()

    if (child) {
      child.update()
    }
  }
}

/* Fish Class */
class Fish {
  constructor(options) {
    this.applyForce = force => {
      this.acceleration.add(force)
    }

    this.calcNeighbourForce = (neighbours, force) => {
      let sum = new p5.Vector(0, 0)
      let count = 0

      for (let i = 0; i < neighbours.length; i++) {
        if (neighbours[i] instanceof Fish && neighbours[i] != this) {
          let distance = p5.Vector.dist(this.position, neighbours[i].position)
          let width = (this.width + neighbours[i].width) / 2

          if (distance > 0 && distance < width) {
            let diff = p5.Vector.sub(this.position, neighbours[i].position)
            diff.normalize()
            diff.div(distance)
            sum.add(diff)
            count++
          }
        }
      }

      if (count > 0) {
        sum.div(count)
        sum.normalize()
        sum.mult(this.maxAvoidanceSpeed)
        sum.sub(this.velocity)
        sum.limit(this.maxAvoidanceForce)
      }

      this.applyForce(sum.mult(force))
    }

    this.calcPosition = () => {
      this.velocity.add(this.acceleration)
      this.velocity.limit(this.maxMovementSpeed)
      this.position.add(this.velocity)
      this.acceleration.mult(0)
    }

    this.calcWiggle = () => {
      if (this.moveToTarget instanceof p5.Vector) {
        let direction = p5.Vector.sub(this.moveToTarget, this.position)
        let angle =
          direction.heading() +
          (sin(this.wiggleDelta) - 0.5) * this.wiggleFactor
        let force = new p5.Vector(cos(angle), sin(angle))

        force.normalize()
        force.mult(this.velocity.mag() / this.maxMovementSpeed)

        this.applyForce(force)
        this.wiggleDelta += random(this.width / 2) / this.width

        if (this.wiggleDelta > 360) {
          this.wiggleDelta = 0
        }
      }
    }

    this.init = () => {
      let lastSegment = null

      for (let i = 0; i < this.numSegments; i++) {
        let options = {
          color: color(
            255,
            map(i, 0, this.numSegments - 1, 225, 110),
            map(i, 0, this.numSegments - 1, 255, 0),
            map(i, 0, this.numSegments - 1, 0, 255)
          ),
          length: this.length / this.numSegments,
          parent: lastSegment,
          width: map(i, 0, this.numSegments - 1, 1, this.width)
        }

        if (i === 0) {
          options.x = options.x ? options.x : 0
          options.y = options.y ? options.y : 0
        }

        let segment = new FishSegment(options)

        if (i === 0) {
          this.firstSegment = segment
        }

        if (lastSegment) {
          lastSegment.child = segment
        }

        lastSegment = segment
      }
    }

    this.acceleration = new p5.Vector(0, 0)
    this.firstSegment = null
    this.length = options.length ? options.length : 100
    this.maxAvoidanceForce = options.maxAvoidanceForce
      ? options.maxAvoidanceForce
      : 0.1
    this.maxAvoidanceSpeed = options.maxAvoidanceSpeed
      ? options.maxAvoidanceSpeed
      : 4
    this.maxMovementForce = options.maxMovementForce
      ? options.maxMovementForce
      : 0.1
    this.maxMovementSpeed = options.maxMovementSpeed
      ? options.maxMovementSpeed
      : 4
    this.moveToTarget = null
    this.numSegments = options.numSegments ? options.numSegments : 10
    this.position =
      options.position && options.position instanceof p5.Vector
        ? options.position
        : new p5.Vector(0, 0)
    this.velocity =
      options.velocity && options.velocity instanceof p5.Vector
        ? options.velocity
        : new p5.Vector(0, 0)
    this.width = options.width ? options.width : 30
    this.wiggleDelta = 0
    this.wiggleFactor = options.wiggleFactor ? options.wiggleFactor : 1

    this.init()
  }

  avoidFish = (fish, force) => {
    this.calcNeighbourForce(fish, force)
  }

  draw = () => {
    if (this.firstSegment) {
      this.firstSegment.draw()
    }
  }

  moveToVector = vector => {
    if (vector instanceof p5.Vector) {
      this.moveToTarget = vector
    }
  }

  moveTowardsVector = vector => {
    let target = p5.Vector.sub(vector, this.position)
    let distance = target.mag()

    if (distance < this.length) {
      if (distance < this.length / 2 && vector == this.moveToTarget) {
        this.moveToTarget = null
      }

      target.setMag(map(distance, 0, this.length, 0, this.maxMovementSpeed))
    } else {
      target.setMag(this.maxMovementSpeed)
    }

    let force = p5.Vector.sub(target, this.velocity)
    force.limit(this.maxMovementForce)

    this.applyForce(force)
  }

  update = () => {
    if (this.moveToTarget instanceof p5.Vector) {
      this.moveTowardsVector(this.moveToTarget)
    }

    this.calcWiggle()
    this.calcPosition()

    if (this.firstSegment && this.firstSegment.lastChild()) {
      this.firstSegment
        .lastChild()
        .lookAtPoint(this.position.x, this.position.y)
    }

    if (this.firstSegment) {
      this.firstSegment.update()
    }
  }
}

/* Resize Window */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
}
