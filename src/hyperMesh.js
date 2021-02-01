import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  CustomBlending,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  MultiplyBlending,
  NoBlending,
  NormalBlending,
  Points,
  PointsMaterial,
  SubtractiveBlending,
  TextureLoader,
  Vector3,
} from 'three'
import disc from './disc.png'
import { tesseract } from './meshes'

export const BLENDINGS = {
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  MultiplyBlending,
  SubtractiveBlending,
  CustomBlending,
}

const defaultColor = 0xffffff

export class HyperMesh extends Group {
  constructor(hyperRenderer, hypermesh = tesseract) {
    super()
    this.hyperRenderer = hyperRenderer
    this.hypermesh = hypermesh
    this.name = hypermesh.name

    this.dotTexture = new TextureLoader().load(disc)
    this.cellSize = 100
    this.offset = 0.001
    this.hasCells = true
    this.hasEdges = true
    this.hasVertices = false
    this.cellBlending = AdditiveBlending
    this.cellOpacity = 0.1
    this.cellDepthWrite = false
    this.edgeBlending = AdditiveBlending
    this.edgeOpacity = 0.04
    this.edgeWidth = 2
    this.edgeDepthWrite = false
    this.wireframe = false

    this.update()
  }

  subGroup(name) {
    return this.children.find(child => child.name === name)
  }

  createSubGroup(name) {
    const subGroup = new Group()
    subGroup.name = name
    return subGroup
  }

  update() {
    // eslint-disable-next-line import/namespace
    if ((this.hypermesh.scale || 1) !== this.scale) {
      this.scale.setScalar(this.hypermesh.scale || 1)
    }

    if (this.hasCells && !this.subGroup('cell')) {
      this.add(this.createSubGroup('cell'))
    }
    if (!this.hasCells && this.subGroup('cell')) {
      this.remove(this.subGroup('cell'))
    }
    if (this.hasEdges && !this.subGroup('edge')) {
      this.add(this.createSubGroup('edge'))
    }
    if (!this.hasEdges && this.subGroup('edge')) {
      this.remove(this.subGroup('edge'))
    }
    if (this.hasVertices && !this.subGroup('vertice')) {
      this.add(this.createSubGroup('vertice'))
    }
    if (!this.hasVertices && this.subGroup('vertice')) {
      this.remove(this.subGroup('vertice'))
    }
    this.hypermesh.cells.forEach((cell, cellIndex) =>
      this.updateCell(cell, cellIndex)
    )
  }

  updateCell(cell, cellIndex) {
    const cellColor = new Color(
      this.hypermesh.colors[cellIndex] || defaultColor
    )

    if (this.hasCells) {
      this.updateCellMeshes(cell, cellIndex, cellColor)
    }

    if (this.hasEdges) {
      this.updateCellEdges(cell, cellIndex, cellColor)
    }

    if (this.hasVertices) {
      this.updateCellVertices(cell, cellIndex, cellColor)
    }
  }

  updateCellMeshes(cell, cellIndex, cellColor) {
    if (!this.subGroup('cell').children[cellIndex]) {
      const newGeometry = new BufferGeometry()
      newGeometry.name = `Hypermesh Cell #${cellIndex} Mesh`
      newGeometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          new Array(
            cell.reduce(
              (sum, faceIndex) => sum + this.hypermesh.faces[faceIndex].length,
              0
            ) * 3
          ).fill(0),
          3
        )
      )
      const indices = []
      let faceShift = 0
      cell.forEach(faceIndex => {
        const face = this.hypermesh.faces[faceIndex]
        new Array(face.length - 2).fill().forEach((_, i) => {
          indices.push(faceShift, faceShift + i + 1, faceShift + i + 2)
        })

        faceShift += face.length
      })

      newGeometry.setIndex(indices)
      this.subGroup('cell').add(
        new Mesh(newGeometry, new MeshLambertMaterial())
      )
    }
    let faceShift = 0
    const mesh = this.subGroup('cell').children[cellIndex]
    cell.forEach(faceIndex => {
      const face = this.hypermesh.faces[faceIndex]
      const faceStart = faceShift
      const faceEnd = faceShift + face.length

      face.forEach((verticeIndex, i) => {
        const vertice = this.hypermesh.vertices[verticeIndex]
        mesh.geometry.attributes.position.setXYZ(
          faceStart + i,
          ...this.hyperRenderer.to3d(vertice)
        )
      })

      faceShift = faceEnd
    })

    mesh.geometry.attributes.position.needsUpdate = true
    mesh.geometry.computeVertexNormals()
    mesh.geometry.attributes.normal.needsUpdate = true

    this.recenter(mesh)

    mesh.material.color = cellColor
    mesh.material.opacity = this.cellOpacity
    mesh.material.transparent = this.cellOpacity !== 1
    mesh.material.blending = this.cellBlending
    mesh.material.side = DoubleSide
    mesh.material.depthWrite = this.cellDepthWrite
    mesh.material.wireframe = this.wireframe
  }

  updateCellEdges(cell, cellIndex, cellColor) {
    if (!this.subGroup('edge').children[cellIndex]) {
      const newGeometry = new BufferGeometry()
      newGeometry.name = `Hypermesh Cell #${cellIndex} Edge`
      newGeometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          new Array(
            cell.reduce(
              (sum, faceIndex) =>
                sum + this.hypermesh.faces[faceIndex].length * 2,
              0
            ) * 3
          ).fill(0),
          3
        )
      )
      this.subGroup('edge').add(
        new LineSegments(newGeometry, new LineBasicMaterial())
      )
    }
    let faceShift = 0
    const edge = this.subGroup('edge').children[cellIndex]
    cell.forEach(faceIndex => {
      const face = this.hypermesh.faces[faceIndex]
      const faceStart = faceShift
      const faceEnd = faceShift + face.length * 2

      face.forEach((verticeIndex, i) => {
        const vertice = this.hypermesh.vertices[verticeIndex]
        const nextVertice = this.hypermesh.vertices[face[(i + 1) % face.length]]
        edge.geometry.attributes.position.setXYZ(
          faceStart + 2 * i,
          ...this.hyperRenderer.to3d(vertice)
        )
        edge.geometry.attributes.position.setXYZ(
          faceStart + 2 * i + 1,
          ...this.hyperRenderer.to3d(nextVertice)
        )
      })
      faceShift = faceEnd
    })

    edge.geometry.attributes.position.needsUpdate = true

    edge.material.color = cellColor
    edge.material.transparent = this.edgeOpacity !== 1
    edge.material.opacity = this.edgeOpacity
    edge.material.blending = this.edgeBlending
    edge.material.linewidth = this.edgeWidth
    edge.material.depthWrite = this.edgeDepthWrite

    this.recenter(edge)
  }
  updateCellVertices(cell, cellIndex, cellColor) {
    const allVertices = [
      ...new Set(
        cell
          .map(faceIndex =>
            this.hypermesh.faces[faceIndex].map(
              verticeIndex => this.hypermesh.vertices[verticeIndex]
            )
          )
          .flat()
      ),
    ]
    if (!this.subGroup('vertice').children[cellIndex]) {
      const newGeometry = new BufferGeometry()
      newGeometry.name = `Hypermesh Cell #${cellIndex} Vertices`
      newGeometry.setAttribute(
        'position',
        new Float32BufferAttribute(new Array(allVertices.length * 3).fill(0), 3)
      )

      this.subGroup('vertice').add(
        new Points(newGeometry, new PointsMaterial())
      )
    }

    const vertice = this.subGroup('vertice').children[cellIndex]
    allVertices.forEach((v, i) => {
      vertice.geometry.attributes.position.setXYZ(
        i,
        ...this.hyperRenderer.to3d(v)
      )
    })
    vertice.geometry.attributes.position.needsUpdate = true

    vertice.material.color = cellColor
    vertice.material.map = this.dotTexture
    vertice.material.size = 0.25
    vertice.material.alphaTest = 0.5

    this.recenter(vertice)
  }

  recenter(mesh) {
    const center = new Vector3()
    mesh.geometry.computeBoundingBox()
    mesh.geometry.boundingBox.getCenter(center)
    mesh.geometry.center()
    mesh.position.copy(center)
    mesh.scale.setScalar(Math.min(this.cellSize / 100, 0.999))
  }
}
