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
  DoubleSide,
  Color,
  FaceColors,
  Vector3,
  Face3,
  FaceNormalsHelper,
  VertexNormalsHelper,
} from 'three'

import disc from './disc.png'
import * as meshes from './meshes'

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

    this.object = 'hexadecachoron'
    this.cells = []
    this.helpers = {
      faceNormals: [],
      vertexNormals: [],
    }
    this.update()
  }

  update() {
    // eslint-disable-next-line import/namespace
    const object = meshes[this.object]
    object.cells.forEach((cell, cellIndex) => {
      if (!this.cellGroup.children[cellIndex]) {
        this.cellGroup.add(new Mesh(new Geometry(), new MeshLambertMaterial()))
      }
      const mesh = this.cellGroup.children[cellIndex]

      const cellColor = new Color(object.colors[cellIndex] || defaultColor)
      const unfoldedCell = cell.map(faceIndex =>
        object.faces[faceIndex].map(
          verticeIndex => object.vertices[verticeIndex]
        )
      )
      const allVertices = unfoldedCell.flat(1)
      const cellVertices = object.vertices.filter(vertice =>
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

  reset() {
    this.cellGroup.remove(...this.cellGroup.children)
    this.edgeGroup.remove(...this.edgeGroup.children)
    this.verticeGroup.remove(...this.verticeGroup.children)
  }
}
