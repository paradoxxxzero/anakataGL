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
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
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

export class HyperMesh {
  constructor(hyperRenderer, hypermesh = tesseract) {
    this.group = new Group()
    this.cellGroup = new Group()
    this.edgeGroup = new Group()
    this.verticeGroup = new Group()

    this.hyperRenderer = hyperRenderer

    this.dotTexture = new TextureLoader().load(disc)
    this.cellSize = 100
    this.offset = 0.001
    this.hasCells = true
    this.hasEdges = true
    this.hasVertices = false
    this.cellBlending = AdditiveBlending
    this.cellOpacity = 0.1
    this.cellDepthWrite = !true
    this.edgeBlending = AdditiveBlending
    this.edgeOpacity = 0.04
    this.edgeWidth = 2
    this.edgeDepthWrite = !true

    this.vertexNormals = false
    this.faceNormals = false

    this.hypermesh = hypermesh
    this.helpers = {
      vertexNormals: [],
    }
    this.update()
  }

  update() {
    // eslint-disable-next-line import/namespace
    const { cells, faces, vertices, colors } = this.hypermesh
    if ((this.hypermesh.scale || 1) !== this.group.scale) {
      this.group.scale.setScalar(this.hypermesh.scale || 1)
    }

    cells.forEach((cell, cellIndex) => {
      const cellColor = new Color(colors[cellIndex] || defaultColor)
      // const unfoldedCell = cell.map(faceIndex =>
      //   this.hypermesh.faces[faceIndex].map(
      //     verticeIndex => this.hypermesh.vertices[verticeIndex]
      //   )
      // )
      // const allVertices = unfoldedCell.flat(1)
      // const cellVertices = this.hypermesh.vertices.filter(vertice =>
      //   allVertices.includes(vertice)
      // )

      // const cellFaces = unfoldedCell.map(face =>
      //   face.map(vertice => cellVertices.indexOf(vertice))
      // )

      // Mesh initialization
      if (!this.cellGroup.children[cellIndex]) {
        const newGeometry = new BufferGeometry()
        newGeometry.name = `Hypermesh Cell #${cellIndex} Mesh`
        newGeometry.setAttribute(
          'position',
          new Float32BufferAttribute(
            new Array(
              cell.reduce(
                (sum, faceIndex) => sum + faces[faceIndex].length,
                0
              ) * 3
            ).fill(0),
            3
          )
        )
        const indices = []
        let faceShift = 0
        cell.forEach(faceIndex => {
          const face = faces[faceIndex]
          switch (face.length) {
            case 3:
              indices.push(faceShift, faceShift + 1, faceShift + 2)
              break

            case 4:
              indices.push(faceShift, faceShift + 1, faceShift + 2)
              indices.push(faceShift, faceShift + 2, faceShift + 3)
              break

            default:
              // TODO: Make it generic
              console.error(`Unsupported face length: ${face.length}`)
              break
          }

          faceShift += face.length
        })

        newGeometry.setIndex(indices)
        this.cellGroup.add(new Mesh(newGeometry, new MeshLambertMaterial()))
      }
      let faceShift = 0
      const mesh = this.cellGroup.children[cellIndex]
      cell.forEach(faceIndex => {
        const face = faces[faceIndex]
        const faceStart = faceShift
        const faceEnd = faceShift + face.length

        face.forEach((verticeIndex, i) => {
          const vertice = vertices[verticeIndex]
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

      const center = new Vector3()
      mesh.geometry.computeBoundingBox()
      mesh.geometry.boundingBox.getCenter(center)
      mesh.geometry.center()
      mesh.position.copy(center)
      mesh.scale.setScalar(Math.min(this.cellSize / 100, 0.999))

      mesh.material.color = cellColor
      mesh.material.opacity = this.cellOpacity
      mesh.material.transparent = this.cellOpacity !== 1
      mesh.material.blending = this.cellBlending
      mesh.material.side = DoubleSide
      mesh.material.depthWrite = this.cellDepthWrite

      if (this.hasEdges) {
        if (!this.edgeGroup.children[cellIndex]) {
          const newGeometry = new BufferGeometry()
          newGeometry.name = `Hypermesh Cell #${cellIndex} Edge`
          newGeometry.setAttribute(
            'position',
            new Float32BufferAttribute(
              new Array(
                cell.reduce(
                  (sum, faceIndex) => sum + faces[faceIndex].length * 2,
                  0
                ) * 3
              ).fill(0),
              3
            )
          )
          this.edgeGroup.add(
            new LineSegments(newGeometry, new LineBasicMaterial())
          )
        }
        let faceShift = 0
        const edge = this.edgeGroup.children[cellIndex]
        cell.forEach(faceIndex => {
          const face = faces[faceIndex]
          const faceStart = faceShift
          const faceEnd = faceShift + face.length * 2

          face.forEach((verticeIndex, i) => {
            const vertice = vertices[verticeIndex]
            const nextVertice = vertices[face[(i + 1) % face.length]]
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

        const center = new Vector3()
        edge.geometry.computeBoundingBox()
        edge.geometry.boundingBox.getCenter(center)
        edge.geometry.center()
        edge.position.copy(center)
        edge.scale.setScalar(Math.min(this.cellSize / 100, 0.999))
      }

      if (this.hasVertices) {
        const allVertices = [
          ...new Set(
            cell
              .map(faceIndex =>
                faces[faceIndex].map(verticeIndex => vertices[verticeIndex])
              )
              .flat()
          ),
        ]
        if (!this.verticeGroup.children[cellIndex]) {
          const newGeometry = new BufferGeometry()
          newGeometry.name = `Hypermesh Cell #${cellIndex} Vertices`
          newGeometry.setAttribute(
            'position',
            new Float32BufferAttribute(
              new Array(allVertices.length * 3).fill(0),
              3
            )
          )

          this.verticeGroup.add(new Points(newGeometry, new PointsMaterial()))
        }

        const vertice = this.verticeGroup.children[cellIndex]
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

        const center = new Vector3()
        vertice.geometry.computeBoundingBox()
        vertice.geometry.boundingBox.getCenter(center)
        vertice.geometry.center()
        vertice.position.copy(center)
        vertice.scale.setScalar(Math.min(this.cellSize / 100, 0.999))
      }
      this.handleDebug(cellIndex, mesh, cellColor)
    })
    if (this.hasCells && !this.group.children.includes(this.cellGroup)) {
      this.group.add(this.cellGroup)
    }
    if (!this.hasCells && this.group.children.includes(this.cellGroup)) {
      this.group.remove(this.cellGroup)
    }
    if (this.hasEdges && !this.group.children.includes(this.edgeGroup)) {
      this.group.add(this.edgeGroup)
    }
    if (!this.hasEdges && this.group.children.includes(this.edgeGroup)) {
      this.group.remove(this.edgeGroup)
      this.edgeGroup.remove(...this.edgeGroup.children)
    }
    if (this.hasVertices && !this.group.children.includes(this.verticeGroup)) {
      this.group.add(this.verticeGroup)
    }
    if (!this.hasVertices && this.group.children.includes(this.verticeGroup)) {
      this.group.remove(this.verticeGroup)
      this.verticeGroup.remove(...this.verticeGroup.children)
    }
  }

  handleDebug(cellIndex, mesh, cellColor) {
    const vertexNormalsHelpers = this.helpers.vertexNormals
    if (this.vertexNormals) {
      if (!vertexNormalsHelpers[cellIndex]) {
        vertexNormalsHelpers[cellIndex] = new VertexNormalsHelper(
          mesh,
          0.5,
          cellColor
        )
        this.group.add(vertexNormalsHelpers[cellIndex])
      }
      // vertexNormalsHelpers[cellIndex].position.copy(mesh.position)
      vertexNormalsHelpers[cellIndex].update()
    } else if (vertexNormalsHelpers[cellIndex]) {
      this.group.remove(vertexNormalsHelpers[cellIndex])
      vertexNormalsHelpers[cellIndex] = null
    }
  }
  switch(hypermesh) {
    this.reset()
    this.hypermesh = hypermesh
  }

  reset() {
    this.cellGroup.remove(...this.cellGroup.children)
    this.edgeGroup.remove(...this.edgeGroup.children)
    this.verticeGroup.remove(...this.verticeGroup.children)
    this.group.remove(...this.helpers.vertexNormals)
    this.helpers.vertexNormals = []
  }
}
