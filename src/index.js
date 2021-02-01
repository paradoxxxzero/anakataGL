import { GUI } from 'dat.gui'
import Stats from 'stats.js'
import {
  AmbientLight,
  Group,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { Axes } from './axes'
import { BLENDINGS, HyperMesh } from './hyperMesh'
import { HyperRenderer } from './hyperRenderer'
import * as meshes from './meshes'
import { toNumber } from './utils'

class Main {
  constructor() {
    this.hyperRotation = {
      xy: 0,
      xz: 0,
      xw: 10,
      yz: 0,
      yw: 10,
      zw: 10,
    }

    this.debug = {
      vertexNormals: false,
    }
    this.debugGroup = new Group()

    this.stats = new Stats()
    this.scene = new Scene()

    this.scene.add(this.debugGroup)

    this.renderer = this.initRenderer()
    this.hyperRenderer = new HyperRenderer(1.5, 5)
    this.camera = this.initCamera()
    this.initControls()
    this.initLights()

    if (!localStorage.getItem('meshes')) {
      localStorage.setItem('meshes', JSON.stringify(meshes))
    }
    const localMeshes = JSON.parse(localStorage.getItem('meshes'))

    window.addEventListener('storage', this.onStorage.bind(this))
    this.mesh = 'tesseract'

    this.hyperMesh = this.initHyperMesh(localMeshes[this.mesh])
    this.selectedCells = []
    this.hoveredCell = null
    this.rayCaster = new Raycaster()
    this.axes = this.initAxes()

    this.gui = this.initGui()
    this.setupDom()
  }

  initRenderer() {
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    return renderer
  }
  initCamera() {
    const camera = new PerspectiveCamera(
      (this.hyperRenderer.fov / Math.PI) * 180,
      window.innerWidth / window.innerHeight,
      1,
      100
    )
    camera.position.set(5, 5, 5)
    this.scene.add(camera)
    return camera
  }
  initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.minDistance = 2
    controls.maxDistance = 50
    return controls
  }
  initLights() {
    const ambientLight = new AmbientLight(0x222222)
    this.scene.add(ambientLight)

    const pointLight = new PointLight(0xffffff, 1)
    this.camera.add(pointLight)
  }
  initHyperMesh(hypermesh) {
    const hyperMesh = new HyperMesh(this.hyperRenderer, hypermesh)
    this.scene.add(hyperMesh.group)
    return hyperMesh
  }

  switchHyperMesh(hypermesh) {
    this.scene.remove(this.hyperMesh.group)
    if (this.debug.vertexNormals) {
      this.handleVertex(false)
    }
    this.hyperMesh = new HyperMesh(this.hyperRenderer, hypermesh)
    this.scene.add(this.hyperMesh.group)
    if (this.debug.vertexNormals) {
      this.handleVertex(true)
    }
  }

  initAxes() {
    const axes = {
      scene: new Scene(),
      camera: new PerspectiveCamera(
        (this.hyperRenderer.fov / Math.PI) * 180,
        1,
        1,
        1000
      ),
      size: 100,
      axes: new Axes(this.hyperRenderer, 2),
    }

    axes.scene.add(axes.axes.group)
    axes.scene.add(axes.camera)
    return axes
  }

  initGui() {
    const gui = new GUI()
    gui
      .add(
        this,
        'mesh',
        Object.keys(JSON.parse(localStorage.getItem('meshes')))
      )
      .onChange(value =>
        this.switchHyperMesh(JSON.parse(localStorage.getItem('meshes'))[value])
      )
    gui.add(
      {
        add: () => {
          const localMeshes = JSON.parse(localStorage.getItem('meshes'))

          const name = prompt('Name of your mesh')
          if (name) {
            localMeshes[name] = {
              vertices: [],
              faces: [],
              cells: [],
              colors: [],
            }
            localStorage.setItem('meshes', JSON.stringify(localMeshes))
          }
        },
      },
      'add'
    )
    gui.add(
      {
        edit: () => window.open(`/edit#${this.mesh}`),
      },
      'edit'
    )
    gui.add(this.hyperRenderer, 'fov', 0, Math.PI).name('w fov')
    gui
      .add({ zfov: (this.camera.fov / 180) * Math.PI }, 'zfov', 0, Math.PI)
      .onChange(value => {
        this.axes.camera.fov = this.camera.fov = (value / Math.PI) * 180
        this.camera.updateProjectionMatrix()
        this.axes.camera.updateProjectionMatrix()
      })
      .listen()
      .name('z fov')
    const rot = gui.addFolder('4d rotation')
    Object.keys(this.hyperRotation).forEach(k => {
      rot.add(this.hyperRenderer.rotation, k, 0, 2 * Math.PI).listen()
    })
    const rotSpeed = gui.addFolder('4d rotation speed')
    Object.keys(this.hyperRotation).forEach(k => {
      rotSpeed.add(this.hyperRotation, k, 0, 50)
    })
    rotSpeed.open()

    const cell = gui.addFolder('Cell')
    cell.add(this.hyperMesh, 'hasCells')
    cell.add(this.hyperMesh, 'cellSize', 0, 100)
    cell.add(this.hyperMesh, 'cellOpacity', 0, 1)
    cell.add(this.hyperMesh, 'cellBlending', BLENDINGS).onChange(toNumber)
    cell.add(this.hyperMesh, 'cellDepthWrite')
    cell.open()

    const edge = gui.addFolder('Edge')
    edge.add(this.hyperMesh, 'hasEdges')
    edge.add(this.hyperMesh, 'edgeOpacity', 0, 1)
    edge.add(this.hyperMesh, 'edgeBlending', BLENDINGS).onChange(toNumber)
    edge.add(this.hyperMesh, 'edgeWidth', 0, 5)
    edge.add(this.hyperMesh, 'edgeDepthWrite')
    edge.open()

    gui.add(this.hyperMesh, 'hasVertices')

    const guiDebug = gui.addFolder('Debug')
    guiDebug
      .add(this.debug, 'vertexNormals')
      .onChange(this.handleVertex.bind(this))
    guiDebug.add(this.hyperMesh, 'wireframe')

    return gui
  }

  handleVertex(on) {
    if (on) {
      this.hyperMesh.cellGroup.children.forEach(mesh => {
        this.debugGroup.add(
          new VertexNormalsHelper(mesh, 0.25, mesh.material.color)
        )
      })
    } else {
      this.debugGroup.clear()
    }
  }

  setupDom() {
    this.mouse = new Vector2()
    document.body.style.margin = 0
    document.body.style.overflow = 'hidden'
    document.body.appendChild(this.renderer.domElement)
    document.body.appendChild(this.stats.dom)
    window.addEventListener('resize', this.onResize.bind(this), false)
  }

  // onMouseMove({ clientX, clientY }) {
  //   this.mouse.x = (clientX / window.innerWidth) * 2 - 1
  //   this.mouse.y = -(clientY / window.innerHeight) * 2 + 1
  //   this.rayCaster.setFromCamera(this.mouse, this.camera)
  //   const intersected = this.rayCaster.intersectObjects(
  //     this.cube.cubes.map(cube => cube.mesh)
  //   )
  //   if (intersected.length) {
  //     this.hoveredCell = intersected[0].object
  //   } else {
  //     this.hoveredCell = null
  //   }
  //   this.syncCells()
  // }
  //
  // onClick() {
  //   this.rayCaster.setFromCamera(this.mouse, this.camera)
  //   const intersected = this.rayCaster.intersectObjects(
  //     this.cube.cubes.map(cube => cube.mesh)
  //   )
  //   if (intersected.length) {
  //     const cube = intersected[0].object
  //     if (this.selectedCells.includes(cube)) {
  //       this.selectedCells = this.selectedCells.filter(cell => cell !== cube)
  //     } else {
  //       this.selectedCells = [...this.selectedCells, cube]
  //     }
  //   }
  //   this.syncCells()
  // }
  //
  // syncCells() {
  //   this.cube.cubes.forEach(cube => {
  //     cube.mesh.material.emissive.setHex(
  //       cube.mesh === this.hoveredCell
  //         ? 0xffffff
  //         : this.selectedCells.includes(cube.mesh)
  //         ? cube.color
  //         : 0
  //     )
  //   })
  // }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  onStorage({ key, newValue }) {
    if (key !== 'meshes') {
      return
    }
    this.switchHyperMesh(JSON.parse(newValue)[this.mesh])
  }

  render() {
    requestAnimationFrame(this.render.bind(this))
    // Updates
    this.stats.update()

    this.hyperRenderer.rotate(this.hyperRotation)
    this.hyperMesh.update()

    this.debugGroup.children.map(child => child.update())

    this.axes.camera.position.copy(this.camera.position)
    this.axes.camera.quaternion.copy(this.camera.quaternion)
    this.axes.axes.update()

    // Rendering

    // Render scene
    this.renderer.setClearColor(
      this.hyperMesh.hypermesh.backgroundColor || 0x000000,
      1
    )
    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight)
    this.renderer.render(this.scene, this.camera)

    // Render axes
    this.renderer.clearDepth()
    this.renderer.setScissorTest(true)
    this.renderer.setScissor(
      window.innerWidth - this.axes.size,
      0,
      this.axes.size,
      this.axes.size
    )
    this.renderer.setViewport(
      window.innerWidth - this.axes.size,
      0,
      this.axes.size,
      this.axes.size
    )
    this.renderer.render(this.axes.scene, this.axes.camera)
    this.renderer.setScissorTest(false)
  }
}

window.anakata = new Main()
window.anakata.render()
