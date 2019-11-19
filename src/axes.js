import { Geometry, Line, LineBasicMaterial, Group } from 'three'

export class Axes {
  constructor(hyperRenderer, u) {
    this.width = 1.5
    this.hyperRenderer = hyperRenderer
    this.u = u || 1
    this.axes = [
      {
        v: [this.u, 0, 0, 0],
        color: 0xff0000,
      },
      {
        v: [0, this.u, 0, 0],
        color: 0x00ff00,
      },
      {
        v: [0, 0, this.u, 0],
        color: 0x0000ff,
      },
      {
        v: [0, 0, 0, this.u],
        color: 0xff00ff,
      },
    ]
    this.origin = [0, 0, 0, 0]
    this.group = new Group()
    this.init()
  }

  init() {
    this.axes.forEach(axis => {
      axis.material = new LineBasicMaterial({
        color: axis.color,
        linewidth: this.width,
      })
      axis.geometry = new Geometry()
      axis.geometry.vertices.push(this.hyperRenderer.toVector3(this.origin))
      axis.geometry.vertices.push(this.hyperRenderer.toVector3(axis.v))
      axis.line = new Line(axis.geometry, axis.material)
      this.group.add(axis.line)
    })
  }

  update() {
    this.axes.forEach(axis => {
      axis.line.geometry.vertices[1] = this.hyperRenderer.toVector3(axis.v)
      axis.line.geometry.verticesNeedUpdate = true
    })
  }
}
