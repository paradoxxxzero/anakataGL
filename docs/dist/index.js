import { GUI } from '../_snowpack/pkg/dat.gui.js'
import Stats from '../_snowpack/pkg/statsjs.js'
import {
  AdditiveBlending,
  AmbientLight,
  Color,
  CustomBlending,
  DoubleSide,
  Group,
  LineBasicMaterial,
  LineSegments,
  MeshLambertMaterial,
  MultiplyBlending,
  NoBlending,
  NormalBlending,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SubtractiveBlending,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from '../_snowpack/pkg/three.js'
import { OrbitControls } from '../_snowpack/pkg/three/examples/jsm/controls/OrbitControls.js'
import { VertexNormalsHelper } from '../_snowpack/pkg/three/examples/jsm/helpers/VertexNormalsHelper.js'
import { Axes } from './axes.js'
import COLORS from './colors.js'
import disc from './disc.png.proxy.js'
import HyperEdgeGeometry from './four/HyperEdgeGeometry.js'
import HyperGeometry from './four/HyperGeometry.js'
import HyperMesh from './four/HyperMesh.js'
import HyperPointsGeometry from './four/HyperPointsGeometry.js'
import HyperRenderer from './four/HyperRenderer.js'
import * as SHAPES from './four/shapes.js'
import presets from './presets.js'

const BLENDINGS = {
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  MultiplyBlending,
  SubtractiveBlending,
  CustomBlending,
}

const PLANES = ['xy', 'xz', 'xw', 'yz', 'yw', 'zw']
const DOT = new TextureLoader().load(disc)

class Main {
  constructor() {
    this.settings = {
      shape: 'tesseract',
      colors: 'onedarkterminator',
      zFov: 90,
      wFov: 90,
      cellSize: 100,
      rotation: {
        xy: 0,
        xz: 0,
        xw: 10,
        yz: 0,
        yw: 10,
        zw: 10,
      },
      rotationSpeed: {
        xy: 0,
        xz: 0,
        xw: 10,
        yz: 0,
        yw: 10,
        zw: 10,
      },
      cells: {
        visible: true,
        opacity: 0.1,
        blending: AdditiveBlending,
        depthWrite: false,
        wireframe: false,
      },
      edges: {
        visible: true,
        opacity: 0.04,
        blending: AdditiveBlending,
        linewidth: 2,
        depthWrite: false,
      },
      vertices: {
        visible: false,
      },
      debug: {
        vertexNormals: false,
      },
    }

    this.debug = {
      vertexNormals: false,
    }
    this.debugGroup = new Group()

    this.stats = new Stats()
    this.scene = new Scene()

    this.scene.add(this.debugGroup)

    this.renderer = this.initRenderer()
    this.hyperRenderer = new HyperRenderer(1.5, 5, this.settings.rotation)
    this.camera = this.initCamera()
    this.controls = this.initControls()
    this.initLights()

    this.hyperMesh = this.initHyperMesh()
    this.hyperEdges = this.initHyperEdges()
    this.hyperPoints = this.initHyperPoints()
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
  initHyperMesh() {
    const shape = SHAPES[this.settings.shape]

    const hyperGeometry = new HyperGeometry(
      shape.vertices,
      shape.faces,
      shape.cells,
      this.hyperRenderer
    )
    const materials = shape.cells.map((_, i) => {
      const material = new MeshLambertMaterial()
      material.opacity = 0.1
      material.transparent = true
      material.blending = AdditiveBlending
      material.side = DoubleSide
      material.depthWrite = false
      material.wireframe = false
      material.color = new Color(
        COLORS[this.settings.colors][i + 1] || 0xffffff
      )
      return material
    })

    const hyperMesh = new HyperMesh(hyperGeometry, materials)

    this.scene.add(hyperMesh)
    return hyperMesh
  }

  initHyperEdges() {
    const shape = SHAPES[this.settings.shape]

    const hyperGeometry = new HyperEdgeGeometry(
      shape.vertices,
      shape.faces,
      shape.cells,
      this.hyperRenderer
    )

    const materials = shape.cells.map((_, i) => {
      const material = new LineBasicMaterial()
      material.opacity = 0.1
      material.transparent = true
      material.blending = AdditiveBlending
      material.side = DoubleSide
      material.depthWrite = false
      material.wireframe = false
      material.color = new Color(
        COLORS[this.settings.colors][i + 1] || 0xffffff
      )
      return material
    })
    const hyperEdges = new HyperMesh(hyperGeometry, materials, LineSegments)
    this.scene.add(hyperEdges)
    return hyperEdges
  }

  initHyperPoints() {
    const shape = SHAPES[this.settings.shape]

    const hyperGeometry = new HyperPointsGeometry(
      shape.vertices,
      shape.faces,
      shape.cells,
      this.hyperRenderer
    )

    const materials = shape.cells.map((_, i) => {
      const material = new PointsMaterial()
      material.map = DOT
      material.size = 0.25
      material.alphaTest = 0.5
      material.color = new Color(
        COLORS[this.settings.colors][i + 1] || 0xffffff
      )
      return material
    })
    const hyperPoints = new HyperMesh(hyperGeometry, materials, Points)
    this.scene.add(hyperPoints)
    return hyperPoints
  }

  switchHyperMesh() {
    if (this.settings.debug.vertexNormals) {
      this.handleVertex(false)
    }
    this.scene.remove(this.hyperPoints)
    this.scene.remove(this.hyperEdges)
    this.scene.remove(this.hyperMesh)
    this.hyperMesh = this.initHyperMesh()
    this.hyperEdges = this.initHyperEdges()
    this.hyperPoints = this.initHyperPoints()

    if (this.settings.debug.vertexNormals) {
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
    const gui = new GUI({
      load: presets,
      preset:
        decodeURIComponent(location.hash.replace(/^#/, '')) || 'Tesseract',
    })
    gui
      .add(this.settings, 'shape', Object.keys(SHAPES))
      .onChange(this.switchHyperMesh.bind(this))
    gui
      .add(this.settings, 'colors', Object.keys(COLORS))
      .onChange(this.switchHyperMesh.bind(this))

    gui.add(this.settings, 'zFov', 0, 180)
    gui.add(this.settings, 'wFov', 0, 180)
    gui.add(this.settings, 'cellSize', 0, 100)

    const rot = gui.addFolder('4d rotation')
    PLANES.forEach(k => {
      rot.add(this.settings.rotation, k, 0, 2 * Math.PI).listen()
    })
    const rotSpeed = gui.addFolder('4d rotation speed')
    PLANES.forEach(k => {
      rotSpeed.add(this.settings.rotationSpeed, k, 0, 50)
    })
    rotSpeed.open()

    const cell = gui.addFolder('Cell')
    cell.add(this.settings.cells, 'visible')
    cell.add(this.settings.cells, 'opacity', 0, 1)
    cell.add(this.settings.cells, 'blending', BLENDINGS)
    cell.add(this.settings.cells, 'depthWrite')
    cell.add(this.settings.cells, 'wireframe')
    cell.open()

    const edge = gui.addFolder('Edge')
    edge.add(this.settings.edges, 'visible')
    edge.add(this.settings.edges, 'opacity', 0, 1)
    edge.add(this.settings.edges, 'blending', BLENDINGS)
    edge.add(this.settings.edges, 'linewidth', 0, 5)
    edge.add(this.settings.edges, 'depthWrite')
    edge.open()

    const vertice = gui.addFolder('Vertice')
    vertice.add(this.settings.vertices, 'visible')

    const guiDebug = gui.addFolder('Debug')
    guiDebug
      .add(this.settings.debug, 'vertexNormals')
      .onChange(this.handleVertex.bind(this))

    gui.remember(this.settings)
    gui.remember(this.settings.rotation)
    gui.remember(this.settings.rotationSpeed)
    gui.remember(this.settings.cells)
    gui.remember(this.settings.edges)

    gui.revert()
    gui.__preset_select.addEventListener('change', ({ target: { value } }) => {
      location.hash = `#${encodeURIComponent(value)}`
    })
    window.addEventListener('hashchange', () => {
      gui.preset =
        decodeURIComponent(location.hash.replace(/^#/, '')) || 'Tesseract'
      gui.revert()
    })
    return gui
  }

  handleVertex(on) {
    if (on) {
      this.hyperMesh.children.forEach(mesh => {
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

  updateSettings() {
    if (this.settings.zFov !== this.camera.fov) {
      this.axes.camera.fov = this.camera.fov = this.settings.zFov
      this.camera.updateProjectionMatrix()
      this.axes.camera.updateProjectionMatrix()
    }
    this.hyperRenderer.fov = (this.settings.wFov * Math.PI) / 180
    this.hyperMesh.cellSize = this.hyperEdges.cellSize = this.hyperPoints.cellSize = this.settings.cellSize
    this.hyperMesh.visible = this.settings.cells.visible
    this.hyperMesh.materials.map(material => {
      material.opacity = this.settings.cells.opacity
      material.blending = +this.settings.cells.blending
      material.transparent = this.settings.cells.opacity < 1
      material.depthWrite = this.settings.cells.depthWrite
    })
    this.hyperEdges.visible = this.settings.edges.visible
    this.hyperEdges.materials.map(material => {
      material.opacity = this.settings.edges.opacity
      material.blending = +this.settings.edges.blending
      material.transparent = this.settings.edges.opacity < 1
      material.linewidth = this.settings.edges.linewidth
      material.depthWrite = this.settings.edges.depthWrite
    })
    this.hyperPoints.visible = this.settings.vertices.visible
  }

  render() {
    requestAnimationFrame(this.render.bind(this))
    // Updates
    this.stats.update()

    this.updateSettings()

    this.hyperRenderer.rotate(this.settings.rotationSpeed)
    if (this.hyperMesh.visible) {
      this.hyperMesh.update()
    }
    if (this.hyperEdges.visible) {
      this.hyperEdges.update()
    }
    if (this.hyperPoints.visible) {
      this.hyperPoints.update()
    }
    this.debugGroup.children.map(child => child.update())

    this.axes.camera.position.copy(this.camera.position)
    this.axes.camera.quaternion.copy(this.camera.quaternion)
    this.axes.axes.update()

    // Rendering

    // Render scene
    this.renderer.setClearColor(COLORS[this.settings.colors][0], 1)
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
