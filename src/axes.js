import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Vector3,
} from 'three'
import { HyperRenderer } from 'four-js'

export class Axes {
  constructor(hyperRenderer, u, origin) {
    this.width = 1.5
    this.hyperRenderer = hyperRenderer
    this.u = u || 1
    this.axes = [
      {
        name: 'x',
        v: [this.u, 0, 0, 0],
        color: 0xff0000,
      },
      {
        name: 'y',
        v: [0, this.u, 0, 0],
        color: 0x00ff00,
      },
      {
        name: 'z',
        v: [0, 0, this.u, 0],
        color: 0x0000ff,
      },
      {
        name: 'w',
        v: [0, 0, 0, this.u],
        color: 0xff00ff,
      },
    ]
    this.origin = new Vector3(...origin)
    this.group = new Group()
    this.init()
  }

  init() {
    this.axes.forEach(axis => {
      axis.material = new LineBasicMaterial({
        color: axis.color,
        linewidth: this.width,
      })
      axis.geometry = new BufferGeometry()
      axis.geometry.name = `${axis.name} axis`
      const points = []
      points.push(...this.origin.toArray())
      points.push(
        ...new Vector3(
          ...HyperRenderer.prototype.project.call(this.hyperRenderer, axis.v)
        )
          .add(this.origin)
          .toArray()
      )
      axis.geometry.setAttribute(
        'position',
        new Float32BufferAttribute(points, 3)
      )
      axis.line = new Line(axis.geometry, axis.material)
      this.group.add(axis.line)
    })
  }

  update() {
    this.axes.forEach(axis => {
      axis.line.geometry.attributes.position.setXYZ(
        1,
        ...new Vector3(
          ...HyperRenderer.prototype.project.call(this.hyperRenderer, axis.v)
        )
          .add(this.origin)
          .toArray()
      )
      axis.line.geometry.attributes.position.needsUpdate = true
    })
  }
}
