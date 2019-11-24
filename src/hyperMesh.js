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
  Vector3,
  Face3,
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

export class HyperMesh {
  constructor(hyperRenderer) {
    this.group = new Group()
    this.hyperRenderer = hyperRenderer

    this.dotTexture = new TextureLoader().load(disc)
    this.cellSize = 100
    this.offset = 0.001
    this.hasFaces = true
    this.hasEdges = true
    this.hasVertices = false
    this.faceBlending = NormalBlending
    this.faceOpacity = 0.5

    this.object = cube

    this.init()
  }

  init() {
    const geometry = new Geometry()
    geometry.vertices = this.object.vertices.map(
      this.hyperRenderer.toVector3.bind(this.hyperRenderer)
    )
    geometry.faces = this.object.faces.reduce((faces, points) => {
      faces.push(
        ...points
          .slice(1, -1)
          .map((p, i) => new Face3(points[0], p, points[i + 2]))
      )
      return faces
    }, [])
    geometry.computeFlatVertexNormals()

    const material = new MeshLambertMaterial({
      color: 0x89ddf3,
      opacity: this.faceOpacity,
      transparent: this.faceOpacity !== 1,
      // premultipliedAlpha: true,
      // emissive: cube.color,
      blending: this.faceBlending,
      side: DoubleSide,
    })
    this.mesh = new Mesh(geometry, material)

    const center = new Vector3()
    this.mesh.geometry.computeBoundingBox()
    this.mesh.geometry.boundingBox.getCenter(center)
    this.mesh.geometry.center()
    this.mesh.position.copy(center)

    const edgesGeometry = new Geometry()
    edgesGeometry.vertices = this.object.faces.reduce((edgeList, face) => {
      face.forEach((v, i) => {
        edgeList.push(
          this.mesh.geometry.vertices[v],
          this.mesh.geometry.vertices[face[i + 1 < face.length ? i + 1 : 0]]
        )
      })
      return edgeList
    }, [])
    const edgeMaterial = new LineBasicMaterial({
      color: 0x89ddf3,
      linewidth: 2,
    })
    this.edges = new LineSegments(edgesGeometry, edgeMaterial)

    this.edges.position.copy(this.mesh.position)

    const verticesGeometry = new Geometry()
    verticesGeometry.vertices = this.mesh.geometry.vertices

    const verticesMaterial = new PointsMaterial({
      color: 0x89ddf3,
      map: this.dotTexture,
      size: 0.25,
      alphaTest: 0.5,
    })
    this.vertices = new Points(verticesGeometry, verticesMaterial)
    this.vertices.position.copy(this.mesh.position)

    if (this.hasFaces) {
      this.group.add(this.mesh)
    }
    if (this.hasEdges) {
      this.group.add(this.edges)
    }
    if (this.hasVertices) {
      this.group.add(this.vertices)
    }
    this.update()
  }

  update() {
    // Update vertices
    this.mesh.geometry.vertices.forEach((v, i) => {
      v.copy(this.hyperRenderer.toVector3(this.object.vertices[i]))
    })
    // Re-center
    const center = new Vector3()
    this.mesh.geometry.computeBoundingBox()
    this.mesh.geometry.boundingBox.getCenter(center)
    this.mesh.geometry.center()
    this.mesh.position.copy(center)

    this.mesh.geometry.verticesNeedUpdate = true
    this.mesh.geometry.computeFlatVertexNormals()

    // Update options
    if (this.hasFaces) {
      this.mesh.material.blending = this.faceBlending
      this.mesh.material.opacity = this.faceOpacity
      this.mesh.material.transparent = this.faceOpacity !== 1
    }

    // Update edges
    if (this.hasEdges) {
      const edges = this.object.faces.reduce((edgeList, face) => {
        face.forEach((v, i) => {
          edgeList.push(
            this.mesh.geometry.vertices[v],
            this.mesh.geometry.vertices[face[i + 1 < face.length ? i + 1 : 0]]
          )
        })
        return edgeList
      }, [])
      this.edges.geometry.vertices.forEach((v, i) => {
        v.copy(edges[i])
      })
      this.edges.position.copy(this.mesh.position)
      this.edges.geometry.verticesNeedUpdate = true
    }

    if (this.hasVertices) {
      this.vertices.geometry.vertices.forEach((v, i) => {
        v.copy(this.mesh.geometry.vertices[i])
      })
      this.vertices.position.copy(this.mesh.position)
      this.vertices.geometry.verticesNeedUpdate = true
    }
  }
}
