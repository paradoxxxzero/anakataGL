import {
  Mesh,
  MeshLambertMaterial,
  Group,
  BoxGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
} from 'three'

export class Tesseract {
  constructor(hyperRenderer) {
    this.group = new Group()
    this.hyperRenderer = hyperRenderer
    this.cubes = [
      {
        shift: (x, y, z) => [1, x, y, z],
        color: 0xff0000,
      },
      {
        shift: (x, y, z) => [-1, x, y, z],
        color: 0x990000,
      },
      {
        shift: (x, y, z) => [x, 1, y, z],
        color: 0x00ff00,
      },
      {
        shift: (x, y, z) => [x, -1, y, z],
        color: 0x009900,
      },
      {
        shift: (x, y, z) => [x, y, 1, z],
        color: 0x0000ff,
      },
      {
        shift: (x, y, z) => [x, y, -1, z],
        color: 0x000099,
      },
      {
        shift: (x, y, z) => [x, y, z, 1],
        color: 0xff00ff,
      },
      {
        shift: (x, y, z) => [x, y, z, -1],
        color: 0x990099,
      },
    ]
    this.init()
  }

  init() {
    this.cubes.forEach(cube => {
      cube.geometry = new BoxGeometry(2, 2, 2)
      cube.hyperVertices = cube.geometry.vertices.map(({ x, y, z }) =>
        cube.shift(x, y, z)
      )
      cube.material = new MeshLambertMaterial({
        color: cube.color,
        opacity: 0.5,
        transparent: true,
      })
      cube.mesh = new Mesh(cube.geometry, cube.material)
      cube.edges = new LineSegments(
        new EdgesGeometry(cube.geometry),
        new LineBasicMaterial({
          color: cube.color,
          linewidth: 2,
          transparent: true,
          opacity: 0.5,
        })
      )
      this.group.add(cube.mesh)
      this.group.add(cube.edges)
    })
    this.update()
  }

  update() {
    this.cubes.forEach(cube => {
      const vertices = cube.hyperVertices.map(
        this.hyperRenderer.toVector3.bind(this.hyperRenderer)
      )
      vertices.forEach(({ x, y, z }, i) => {
        cube.mesh.geometry.vertices[i].x = x
        cube.mesh.geometry.vertices[i].y = y
        cube.mesh.geometry.vertices[i].z = z
      })
      cube.mesh.geometry.verticesNeedUpdate = true
      cube.mesh.geometry.computeFlatVertexNormals()
      cube.edges.geometry = new EdgesGeometry(cube.geometry)
    })
  }
}
