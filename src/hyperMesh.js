import {
  Mesh,
  MeshLambertMaterial,
  Group,
  Geometry,
  LineSegments,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  TextureLoader,
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  CustomBlending,
  BackSide,
  DoubleSide,
  Color,
  FaceColors,
  VertexColors,
  Vector3,
  Face3,
  FaceNormalsHelper,
  VertexNormalsHelper,
} from 'three'

import disc from './disc.png'

export const BLENDINGS = {
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  MultiplyBlending,
  SubtractiveBlending,
  CustomBlending,
}

const cube = {
  vertices: [
    [1, 1, 1, 1],
    [1, 1, -1, 1],
    [1, -1, -1, 1],
    [1, -1, 1, 1],
    [-1, 1, 1, 1],
    [-1, 1, -1, 1],
    [-1, -1, -1, 1],
    [-1, -1, 1, 1],
  ],
  faces: [
    [0, 1, 2, 3],
    [0, 4, 5, 1],
    [0, 3, 7, 4],
    [3, 2, 6, 7],
    [1, 5, 6, 2],
    [4, 7, 6, 5],
  ],
}

const tesseract = {
  vertices: [
    [1, 1, 1, 1], // 0
    [1, 1, -1, 1], // 1
    [1, -1, -1, 1], // 2
    [1, -1, 1, 1], // 3
    [-1, 1, 1, 1], // 4
    [-1, 1, -1, 1], // 5
    [-1, -1, -1, 1], // 6
    [-1, -1, 1, 1], // 7
    [1, 1, 1, -1], // 8
    [1, 1, -1, -1], // 9
    [1, -1, -1, -1], // 10
    [1, -1, 1, -1], // 11
    [-1, 1, 1, -1], // 12
    [-1, 1, -1, -1], // 13
    [-1, -1, -1, -1], // 14
    [-1, -1, 1, -1], // 15
  ],
  faces: [
    [0, 1, 2, 3], // 0
    [0, 4, 5, 1], // 1
    [0, 3, 7, 4], // 2
    [3, 2, 6, 7], // 3
    [1, 5, 6, 2], // 4
    [4, 7, 6, 5], // 5

    [0, 1, 9, 8], // 6
    [4, 5, 13, 12], // 7
    [3, 2, 10, 11], // 8
    [7, 6, 14, 15], // 9

    [0, 3, 11, 8], // 10
    [4, 7, 15, 12], // 11
    [1, 2, 10, 9], // 12
    [5, 6, 14, 13], // 13

    [0, 4, 12, 8], // 14
    [1, 5, 13, 9], // 15
    [2, 6, 14, 10], // 16
    [3, 7, 15, 11], // 17

    [11, 10, 9, 8], // 18
    [9, 13, 12, 8], // 19
    [12, 15, 11, 8], // 20
    [15, 14, 10, 11], // 21
    [10, 14, 13, 9], // 22
    [13, 14, 15, 12], // 23
  ],
  cells: [
    [0, 1, 2, 3, 4, 5], // 0
    [0, 6, 12, 8, 10, 18], // 1
    [1, 6, 14, 7, 15, 19], // 2
    [4, 12, 16, 13, 15, 22], // 3
    [3, 8, 16, 9, 17, 21], // 4
    [2, 10, 17, 11, 14, 20], // 5
    [5, 7, 13, 9, 11, 23], // 6
    [18, 19, 20, 21, 22, 23], // 7
  ],
  colors: [
    0x727072,
    0xff6188,
    0xa9dc76,
    0xffd866,
    0xfc9867,
    0xab9df2,
    0x78dce8,
    0xfcfcfa,
  ],
}

const defaultColor = 0xffffff

export class HyperMesh {
  constructor(hyperRenderer) {
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
    this.cellBlending = NormalBlending
    this.cellOpacity = 0.5
    this.cellDepthWrite = true
    this.edgeBlending = NormalBlending
    this.edgeOpacity = 1
    this.edgeWidth = 2
    this.edgeDepthWrite = true

    this.vertexNormals = false
    this.faceNormals = false

    this.object = tesseract
    this.cells = []
    this.helpers = {
      faceNormals: [],
      vertexNormals: [],
    }
    this.update()
  }

  update() {
    this.object.cells.forEach((cell, cellIndex) => {
      if (!this.cellGroup.children[cellIndex]) {
        this.cellGroup.add(new Mesh(new Geometry(), new MeshLambertMaterial()))
      }
      const mesh = this.cellGroup.children[cellIndex]

      const cellColor = new Color(this.object.colors[cellIndex] || defaultColor)
      const unfoldedCell = cell.map(faceIndex =>
        this.object.faces[faceIndex].map(
          verticeIndex => this.object.vertices[verticeIndex]
        )
      )
      const allVertices = unfoldedCell.flat(1)
      const cellVertices = this.object.vertices.filter(vertice =>
        allVertices.includes(vertice)
      )

      const cellFaces = unfoldedCell.map(face =>
        face.map(vertice => cellVertices.indexOf(vertice))
      )

      if (!mesh.geometry.vertices.length) {
        mesh.geometry.vertices = cellVertices.map(() => new Vector3())
      }
      mesh.geometry.vertices.forEach((vertice, verticeIndex) => {
        vertice.copy(this.hyperRenderer.toVector3(cellVertices[verticeIndex]))
      })

      if (!mesh.geometry.faces.length) {
        mesh.geometry.faces = cellFaces.reduce((faces, points) => {
          faces.push(
            ...points.slice(1, -1).map((p, i) => {
              const face = new Face3(points[0], p, points[i + 2])
              face.color = cellColor
              return face
            })
          )
          return faces
        }, [])
      }
      const center = new Vector3()
      mesh.geometry.computeBoundingBox()
      mesh.geometry.boundingBox.getCenter(center)
      mesh.geometry.center()
      mesh.position.copy(center)
      mesh.scale.setScalar(Math.min(this.cellSize / 100, 0.999))

      mesh.geometry.computeFlatVertexNormals()
      mesh.geometry.verticesNeedUpdate = true

      mesh.material.opacity = this.cellOpacity
      mesh.material.transparent = this.cellOpacity !== 1
      mesh.material.blending = this.cellBlending
      mesh.material.vertexColors = FaceColors
      mesh.material.side = DoubleSide
      mesh.material.depthWrite = this.cellDepthWrite
      // mesh.material.needsUpdate = true

      if (this.hasEdges) {
        if (!this.edgeGroup.children[cellIndex]) {
          this.edgeGroup.add(
            new LineSegments(new Geometry(), new LineBasicMaterial())
          )
        }

        const edge = this.edgeGroup.children[cellIndex]
        if (!edge.geometry.vertices.length) {
          edge.geometry.vertices = cellFaces
            .map(face => face.map(() => [new Vector3(), new Vector3()]))
            .flat(2)
        }

        cellFaces
          .map(face =>
            face.map((verticeIndex, faceIndex) => [
              mesh.geometry.vertices[verticeIndex],
              mesh.geometry.vertices[
                face[faceIndex + 1 < face.length ? faceIndex + 1 : 0]
              ],
            ])
          )
          .flat(2)
          .forEach((newVertice, verticeIndex) =>
            edge.geometry.vertices[verticeIndex].copy(newVertice)
          )
        edge.geometry.verticesNeedUpdate = true

        edge.material.color = cellColor
        edge.material.transparent = this.edgeOpacity !== 1
        edge.material.opacity = this.edgeOpacity
        edge.material.blending = this.edgeBlending
        edge.material.linewidth = this.edgeWidth
        edge.material.depthWrite = this.edgeDepthWrite

        edge.material.needsUpdate = true

        edge.position.copy(mesh.position)
        edge.scale.setScalar(mesh.scale.x)
      }
      if (this.hasVertices) {
        if (!this.verticeGroup.children[cellIndex]) {
          this.verticeGroup.add(
            new Points(new Geometry(), new PointsMaterial())
          )
        }

        const vertice = this.verticeGroup.children[cellIndex]
        if (!vertice.geometry.vertices.length) {
          vertice.geometry.vertices = cellVertices.map(() => new Vector3())
        }
        vertice.geometry.vertices.forEach((v, verticeIndex) => {
          v.copy(mesh.geometry.vertices[verticeIndex])
        })
        vertice.geometry.verticesNeedUpdate = true

        vertice.material.color = cellColor
        vertice.material.map = this.dotTexture
        vertice.material.size = 0.25
        vertice.material.alphaTest = 0.5
        // vertice.material.needsUpdate = true

        vertice.position.copy(mesh.position)
        vertice.scale.setScalar(mesh.scale.x)
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
    const faceNormalsHelpers = this.helpers.faceNormals
    if (this.faceNormals) {
      if (!faceNormalsHelpers[cellIndex]) {
        faceNormalsHelpers[cellIndex] = new FaceNormalsHelper(
          mesh,
          0.5,
          cellColor
        )
        mesh.add(faceNormalsHelpers[cellIndex])
      }
      // faceNormalsHelpers[cellIndex].position.copy(mesh.position)
      faceNormalsHelpers[cellIndex].update()
    } else if (faceNormalsHelpers[cellIndex]) {
      mesh.remove(faceNormalsHelpers[cellIndex])
      faceNormalsHelpers[cellIndex] = null
    }

    const vertexNormalsHelpers = this.helpers.vertexNormals
    if (this.vertexNormals) {
      if (!vertexNormalsHelpers[cellIndex]) {
        vertexNormalsHelpers[cellIndex] = new VertexNormalsHelper(
          mesh,
          0.5,
          cellColor
        )
        mesh.add(vertexNormalsHelpers[cellIndex])
      }
      // vertexNormalsHelpers[cellIndex].position.copy(mesh.position)
      vertexNormalsHelpers[cellIndex].update()
    } else if (vertexNormalsHelpers[cellIndex]) {
      mesh.remove(vertexNormalsHelpers[cellIndex])
      vertexNormalsHelpers[cellIndex] = null
    }
  }
}
