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
    [1, 1, 1, 1],
    [1, 1, -1, 1],
    [1, -1, -1, 1],
    [1, -1, 1, 1],
    [-1, 1, 1, 1],
    [-1, 1, -1, 1],
    [-1, -1, -1, 1],
    [-1, -1, 1, 1],
    [1, 1, 1, -1],
    [1, 1, -1, -1],
    [1, -1, -1, -1],
    [1, -1, 1, -1],
    [-1, 1, 1, -1],
    [-1, 1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, 1, -1],
  ],
  faces: [
    [0, 1, 2, 3],
    [0, 4, 5, 1],
    [0, 3, 7, 4],
    [3, 2, 6, 7],
    [1, 5, 6, 2],
    [4, 7, 6, 5],

    [8, 9, 10, 11],
    [8, 12, 13, 9],
    [8, 11, 15, 12],
    [11, 10, 14, 15],
    [9, 13, 14, 10],
    [12, 15, 14, 13],

    [0, 1, 9, 8],
    [4, 5, 13, 12],
    [3, 2, 10, 11],
    [7, 6, 14, 15],

    [0, 3, 11, 8],
    [4, 7, 15, 12],
    [1, 2, 10, 9],
    [5, 6, 14, 13],

    [0, 4, 12, 8],
    [1, 5, 13, 9],
    [2, 6, 14, 10],
    [3, 7, 15, 11],
  ],
}

const color = 0xffffff

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

    this.vertexNormals = false
    this.faceNormals = false

    this.object = tesseract

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
    geometry.computeFaceNormals()
    geometry.computeFlatVertexNormals()

    const material = new MeshLambertMaterial({
      color: color,
      opacity: this.faceOpacity,
      transparent: this.faceOpacity !== 1,
      blending: this.faceBlending,
    })
    material.side = DoubleSide
    this.mesh = new Mesh(geometry, material)

    // const center = new Vector3()
    // this.mesh.geometry.computeBoundingBox()
    // this.mesh.geometry.boundingBox.getCenter(center)
    // this.mesh.geometry.center()
    // this.mesh.position.copy(center)

    this.toggleFaces(this.hasFaces)
    this.toggleEdges(this.hasEdges)
    this.toggleVertices(this.hasVertices)

    this.update()
  }

  update() {
    // Update vertices
    this.mesh.geometry.vertices.forEach((v, i) => {
      v.copy(this.hyperRenderer.toVector3(this.object.vertices[i]))
    })
    // // Re-center
    // const center = new Vector3()
    // this.mesh.geometry.computeBoundingBox()
    // this.mesh.geometry.boundingBox.getCenter(center)
    // this.mesh.geometry.center()
    // this.mesh.position.copy(center)

    this.mesh.geometry.verticesNeedUpdate = true
    this.mesh.geometry.computeFaceNormals()
    this.mesh.geometry.computeFlatVertexNormals()

    if (this.faceNormals) {
      this.faceNormalsHelper.update()
    }

    if (this.vertexNormals) {
      this.vertexNormalsHelper.update()
    }

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
      // this.edges.position.copy(this.mesh.position)
      this.edges.geometry.verticesNeedUpdate = true
    }

    if (this.hasVertices) {
      this.vertices.geometry.vertices.forEach((v, i) => {
        v.copy(this.mesh.geometry.vertices[i])
      })
      // this.vertices.position.copy(this.mesh.position)
      this.vertices.geometry.verticesNeedUpdate = true
    }
  }

  toggleFaces(value) {
    if (value) {
      this.group.add(this.mesh)
    } else {
      this.group.remove(this.mesh)
    }
  }

  toggleEdges(value) {
    if (value) {
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
        color: color,
        linewidth: 2,
      })
      this.edges = new LineSegments(edgesGeometry, edgeMaterial)
      this.group.add(this.edges)
      // this.edges.position.copy(this.mesh.position)
    } else if (this.edges) {
      this.group.remove(this.edges)
      this.vertices.edges.dispose()
      this.vertices.edges.dispose()
      this.edges = null
    }
  }

  toggleVertices(value) {
    if (value) {
      const verticesGeometry = new Geometry()
      verticesGeometry.vertices = this.mesh.geometry.vertices

      const verticesMaterial = new PointsMaterial({
        color: color,
        map: this.dotTexture,
        size: 0.25,
        alphaTest: 0.5,
      })
      this.vertices = new Points(verticesGeometry, verticesMaterial)
      this.vertices.position.copy(this.mesh.position)
      this.group.add(this.vertices)
    } else if (this.vertices) {
      this.group.remove(this.vertices)
      this.vertices.geometry.dispose()
      this.vertices.material.dispose()
      this.vertices = null
    }
  }

  toggleVertexNormals(value) {
    if (value) {
      this.vertexNormalsHelper = new VertexNormalsHelper(this.mesh, 1)
      this.mesh.add(this.vertexNormalsHelper)
    } else if (this.vertexNormalsHelper) {
      this.mesh.remove(this.vertexNormalsHelper)
      this.vertexNormalsHelper = null
    }
  }

  toggleFaceNormals(value) {
    if (value) {
      this.faceNormalsHelper = new FaceNormalsHelper(this.mesh, 1)
      this.mesh.add(this.faceNormalsHelper)
    } else if (this.faceNormalsHelper) {
      this.mesh.remove(this.faceNormalsHelper)
      this.faceNormalsHelper = null
    }
  }
}
