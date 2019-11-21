import {
  Mesh,
  MeshLambertMaterial,
  Group,
  BoxGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  BufferGeometry,
  Points,
  PointsMaterial,
  TextureLoader,
  AdditiveBlending,
  MultiplyBlending,
  SubtractiveBlending,
  DoubleSide,
  FrontSide,
  BackSide,
} from 'three'

import disc from './disc.png'

export class Tesseract {
  constructor(hyperRenderer) {
    this.group = new Group()
    this.hyperRenderer = hyperRenderer
    this.cubes = [
      {
        shift: (x, y, z) => [1, x, y, z],
        color: 0xc3e88d,
      },
      {
        shift: (x, y, z) => [-1, x, y, z],
        color: 0x009688,
      },
      {
        shift: (x, y, z) => [x, 1, y, z],
        color: 0x73d1c8,
      },
      {
        shift: (x, y, z) => [x, -1, y, z],
        color: 0x89ddf3,
      },
      {
        shift: (x, y, z) => [x, y, 1, z],
        color: 0x82aaff,
      },
      {
        shift: (x, y, z) => [x, y, -1, z],
        color: 0x7986cb,
      },
      {
        shift: (x, y, z) => [x, y, z, 1],
        color: 0xc792ea,
      },
      {
        shift: (x, y, z) => [x, y, z, -1],
        color: 0xff5370,
      },
    ]
    this.dotTexture = new TextureLoader().load(disc)
    this.cellSize = 100
    this.offset = 0.001
    this.hasFaces = true
    this.hasEdges = true
    this.hasVertices = false
    this.init()
  }

  init() {
    this.cubes.forEach(cube => {
      const two = (this.cellSize / 100) * (2 - this.offset)
      cube.geometry = new BoxGeometry(two, two, two)
      cube.mesh = new Mesh(
        cube.geometry,
        new MeshLambertMaterial({
          color: cube.color,
          opacity: 0.75,
          transparent: true,
          // premultipliedAlpha: true,
          // emissive: cube.color,
          // blending: SubtractiveBlending,
        })
      )
      cube.mesh.material.side = DoubleSide
      if (this.hasFaces) {
        this.group.add(cube.mesh)
      }
      cube.edges = new LineSegments(
        new EdgesGeometry(cube.geometry),
        new LineBasicMaterial({
          color: cube.color,
          linewidth: 2,
        })
      )
      if (this.hasEdges) {
        this.group.add(cube.edges)
      }
      cube.vertices = new Points(
        new BufferGeometry().setFromPoints(cube.geometry.vertices),
        new PointsMaterial({
          color: cube.color,
          map: this.dotTexture,
          size: 0.25,
          alphaTest: 0.5,
        })
      )
      if (this.hasVertices) {
        this.group.add(cube.vertices)
      }
    })
    this.update()
  }

  update() {
    this.cubes.forEach(cube => {
      const two = (this.cellSize / 100) * (2 - this.offset)
      const vertices = new BoxGeometry(two, two, two).vertices
        .map(({ x, y, z }) => cube.shift(x, y, z))
        .map(this.hyperRenderer.toVector3.bind(this.hyperRenderer))
      vertices.forEach(({ x, y, z }, i) => {
        cube.mesh.geometry.vertices[i].x = x
        cube.mesh.geometry.vertices[i].y = y
        cube.mesh.geometry.vertices[i].z = z
      })
      cube.mesh.geometry.verticesNeedUpdate = true
      cube.mesh.geometry.computeFlatVertexNormals()
      if (this.hasEdges) {
        cube.edges.geometry = new EdgesGeometry(cube.geometry)
      }
      if (this.hasVertices) {
        cube.vertices.geometry = new BufferGeometry().setFromPoints(
          cube.geometry.vertices
        )
      }
    })
  }
}
