import { GUI } from 'dat.gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  PointLight,
  Raycaster,
  Vector2,
} from 'three'
import Stats from 'stats.js'

import { Axes } from './axes'
import { HyperMesh, BLENDINGS } from './hyperMesh'
import { HyperRenderer } from './hyperRenderer'
import * as meshes from './meshes'
import { toNumber } from './utils'

class Main {
  constructor() {
    this.hyperRotation = {
      xy: 0,
      xz: 0,
      xw: 0,
      yz: 0,
      yw: 0,
      zw: 10,
    }

    this.stats = new Stats()
    this.scene = new Scene()

    this.renderer = this.initRenderer()
    this.hyperRenderer = new HyperRenderer(1.5, 5)
    this.camera = this.initCamera()
    this.initControls()
    this.initLights()

    this.hyperMesh = this.initHyperMesh()
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
    renderer.autoClear = false
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setScissorTest(true)
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
  initHyperMesh() {
    const hyperMesh = new HyperMesh(this.hyperRenderer)
    this.scene.add(hyperMesh.group)
    return hyperMesh
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
      .add(this.hyperMesh, 'object', Object.keys(meshes))
      .onChange(this.hyperMesh.reset.bind(this.hyperMesh))
    gui.add(this.hyperRenderer, 'fov', 0, Math.PI)
    gui.add(this.camera, 'fov', 0, Math.PI).onChange(value => {
      this.axes.camera.fov = this.camera.fov = (value / Math.PI) * 180
      this.camera.updateProjectionMatrix()
      this.axes.camera.updateProjectionMatrix()
    })
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
    guiDebug.add(this.hyperMesh, 'vertexNormals')
    guiDebug.add(this.hyperMesh, 'faceNormals')
    // const click = this.onClick.bind(this)
    // gui.add({ selection: false }, 'selection').onChange(value => {
    //   document[value ? 'addEventListener' : 'removeEventListener'](
    //     'mousemove',
    //     mouseMove,
    //     false
    //   )
    //   document[value ? 'addEventListener' : 'removeEventListener'](
    //     'click',
    //     click,
    //     false
    //   )
    //   if (!value) {
    //     this.hoveredCell = null
    //     this.selectedCells = []
    //     this.syncCells()
    //   }
    // })
    return gui
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

  render() {
    requestAnimationFrame(this.render.bind(this))
    this.hyperRenderer.rotate(this.hyperRotation)
    this.hyperMesh.update()

    this.renderer.setViewport(0, 0, window.innerWidth, window.innerHeight)
    this.renderer.setScissor(0, 0, window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(
      // eslint-disable-next-line import/namespace
      meshes[this.hyperMesh.object].backgroundColor,
      1
    )
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)

    this.axes.camera.position.copy(this.camera.position)
    this.axes.camera.quaternion.copy(this.camera.quaternion)

    this.axes.axes.update()
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
    this.stats.update()
  }
}

window.anakata = new Main()
window.anakata.render()
