import { GUI } from 'dat.gui'
import {
  HyperEdgesGeometry,
  HyperGeometry,
  HyperGeometryMergedVertices,
  HyperMesh,
  HyperPointsGeometry,
  HyperRenderer,
  shapes,
} from 'four-js'
import Stats from 'stats.js'
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
  ShaderMaterial,
  Raycaster,
  Scene,
  SubtractiveBlending,
  Vector2,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { Axes } from './axes'
import COLORS from './colors'
import presets from './presets'

const BLENDINGS = {
  NoBlending,
  NormalBlending,
  AdditiveBlending,
  MultiplyBlending,
  SubtractiveBlending,
  CustomBlending,
}

const getPreset = () =>
  decodeURIComponent(location.hash.replace(/^#/, '')) || presets.preset
const preset = getPreset()

const PLANES = ['xy', 'xz', 'xw', 'yz', 'yw', 'zw']

class Main {
  constructor() {
    const remembered = presets.remembered[preset]
    this.settings = {
      ...remembered[0],
      rotation: remembered[1],
      rotationSpeed: remembered[2],
      cells: remembered[3],
      edges: remembered[4],
      vertices: remembered[5],
      debug: {
        vertexNormals: false,
      },
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
    this.shape = this.getShape()

    this.hyperMesh = this.initHyperMesh()
    this.hyperEdges = this.initHyperEdges(this.hyperMesh)
    this.hyperPoints = this.initHyperPoints(this.hyperMesh)
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
    renderer.xr.enabled = true

    return renderer
  }
  initCamera() {
    const camera = new PerspectiveCamera(
      (this.hyperRenderer.fov / Math.PI) * 180,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    )
    camera.position.set(0, 1.6, 3)
    this.scene.add(camera)

    return camera
  }
  initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.minDistance = 2
    controls.maxDistance = 50
    controls.target.set(0, 1.6, -3)
    controls.update()
    return controls
  }
  initLights() {
    const ambientLight = new AmbientLight(0x222222)
    this.scene.add(ambientLight)

    const pointLight = new PointLight(0xffffff, 1)
    this.camera.add(pointLight)
  }
  initHyperMesh() {
    const hyperGeometry = new (
      this.settings.cells.merged ? HyperGeometryMergedVertices : HyperGeometry
    )(
      this.shape.vertices,
      this.shape.faces,
      this.shape.cells,
      this.hyperRenderer
    )
    const colors = COLORS[this.settings.colors].slice(1)
    const materials = this.shape.cells.map((_, i) => {
      const material = new MeshLambertMaterial()
      material.opacity = 0.1
      material.transparent = true
      material.blending = AdditiveBlending
      material.side = DoubleSide
      material.depthWrite = false
      material.wireframe = false
      material.color = new Color(colors[i % colors.length])
      return material
    })

    const hyperMesh = new HyperMesh(hyperGeometry, materials)
    hyperMesh.position.set(0, 1.6, -3)
    this.scene.add(hyperMesh)
    return hyperMesh
  }

  initHyperEdges(hyperMesh) {
    const hyperGeometry = new HyperEdgesGeometry(
      hyperMesh.hyperGeometry,
      this.hyperRenderer
    )

    const colors = COLORS[this.settings.colors].slice(1)
    const materials = this.shape.cells.map((_, i) => {
      const material = new LineBasicMaterial()
      material.opacity = 0.1
      material.transparent = true
      material.blending = AdditiveBlending
      material.depthWrite = false
      material.linewidth = 2
      material.color = new Color(colors[i % colors.length])
      return material
    })
    const hyperEdges = new HyperMesh(hyperGeometry, materials, LineSegments)
    hyperEdges.position.set(0, 1.6, -3)
    this.scene.add(hyperEdges)
    return hyperEdges
  }

  initHyperPoints(hyperMesh) {
    const hyperGeometry = new HyperPointsGeometry(
      hyperMesh.hyperGeometry,
      this.hyperRenderer
    )

    const colors = COLORS[this.settings.colors].slice(1)
    const materials = this.shape.cells.map((_, i) => {
      const material = new ShaderMaterial({
        uniforms: {
          size: { value: 5 },
          opacity: { value: 0.5 },
          color: { value: new Color(colors[i % colors.length]) },
        },
        vertexShader: `uniform float size;
        
        void main() {
        
          vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        
          gl_PointSize = size * ( 10.0 / - mvPosition.z );
        
          gl_Position = projectionMatrix * mvPosition;
        }`,
        fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
    
          void main() {
          
            if (length(gl_PointCoord - vec2( 0.5, 0.5 )) > 0.475) discard;
          
            gl_FragColor = vec4(color, opacity );
          } `,
      })
      material.transparent = true
      material.depthWrite = false
      return material
    })
    const hyperPoints = new HyperMesh(hyperGeometry, materials, Points)
    hyperPoints.position.set(0, 1.6, -3)
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

    this.shape = this.getShape()
    this.hyperMesh = this.initHyperMesh()
    this.hyperEdges = this.initHyperEdges(this.hyperMesh)
    this.hyperPoints = this.initHyperPoints(this.hyperMesh)

    if (this.settings.debug.vertexNormals) {
      this.handleVertex(true)
    }
  }

  getShape() {
    const {
      x: fx,
      y: fy,
      z: fz,
      w: fw,
      uMin,
      uMax,
      uResolution,
      uInclusive,
      uLoop,
      vMin,
      vMax,
      vResolution,
      vInclusive,
      vLoop,
      wMin,
      wMax,
      wResolution,
      wInclusive,
      wLoop,
      withUCells,
      withVCells,
      withWCells,
    } = this.settings
    if (!this.settings.shape.startsWith('generate')) {
      return shapes[this.settings.shape]
    } else if (this.settings.shape === 'generateUVWHyperSurface') {
      return shapes[this.settings.shape](
        this.eval(fx, fy, fz, fw),
        [uMin, uMax, uResolution, uInclusive, uLoop],
        [vMin, vMax, vResolution, vInclusive, vLoop],
        [wMin, wMax, wResolution, wInclusive, wLoop],
        { u: withUCells, v: withVCells, w: withWCells }
      )
    } else if (this.settings.shape === 'generateUVSurface') {
      return shapes[this.settings.shape](
        this.eval(fx, fy, fz, fw),
        [uMin, uMax, uResolution, uInclusive, uLoop],
        [vMin, vMax, vResolution, vInclusive, vLoop]
      )
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

  async enterVR() {
    const sessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor'],
    }
    const session = await navigator.xr.requestSession(
      'immersive-vr',
      sessionInit
    )

    await this.renderer.xr.setSession(session)
  }

  async initGui() {
    const gui = new GUI({
      load: presets,
      preset,
    })
    const hasVR =
      navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr'))
    if (hasVR) {
      gui.add(
        {
          'Enter VR': this.enterVR.bind(this),
        },
        'Enter VR'
      )
    }
    gui
      .add(
        this.settings,
        'shape',
        Object.keys(shapes).filter(
          name =>
            !name.startsWith('generate') ||
            ['generateUVSurface', 'generateUVWHyperSurface'].includes(name)
        )
      )
      .onChange(this.switchHyperMesh.bind(this))

    const uvw = gui.addFolder('uvw')
    uvw
      .add(this.settings, 'x', 'cos(v) * cos(u)')
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'y', 'cos(v) * sin(u)')
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'z', 'sin(v) * cos(u)')
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'w', 'sin(v) * sin(u)')
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'uMin', -1000, 1000, 0.001)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'uMax', -1000, 1000, 0.001)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'uInclusive', false)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'uLoop', false)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'uResolution', 0, 128, 1)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'vMin', -1000, 1000, 0.001)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'vMax', -1000, 1000, 0.001)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'vInclusive', false)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'vLoop', false)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'vResolution', 0, 128, 1)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'wMin', -1000, 1000, 0.001)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'wMax', -1000, 1000, 0.001)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'wInclusive', false)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'wLoop', false)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'wResolution', 0, 128, 1)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'withUCells', true)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'withVCells', true)
      .onChange(this.switchHyperMesh.bind(this))
    uvw
      .add(this.settings, 'withWCells', true)
      .onChange(this.switchHyperMesh.bind(this))

    gui
      .add(this.settings, 'colors', Object.keys(COLORS))
      .onChange(this.switchHyperMesh.bind(this))

    gui.add(this.settings, 'zFov', 0, 180)
    gui.add(this.settings, 'wFov', 0, 180)
    gui.add(this.settings, 'cellSize', 0, 100)
    gui.add(this.settings, 'scale', 0, 20, 0.1)

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
    cell
      .add(this.settings.cells, 'merged')
      .onChange(this.switchHyperMesh.bind(this))
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
    vertice.add(this.settings.vertices, 'opacity', 0, 1)
    vertice.add(this.settings.vertices, 'size', 0, 100)

    const guiDebug = gui.addFolder('Debug')
    guiDebug
      .add(this.settings.debug, 'vertexNormals')
      .onChange(this.handleVertex.bind(this))

    gui.remember(this.settings)
    gui.remember(this.settings.rotation)
    gui.remember(this.settings.rotationSpeed)
    gui.remember(this.settings.cells)
    gui.remember(this.settings.edges)
    gui.remember(this.settings.vertices)

    gui.revert()
    gui.__preset_select.addEventListener('change', ({ target: { value } }) => {
      location.hash = `#${encodeURIComponent(value)}`
    })
    window.addEventListener('hashchange', () => {
      gui.preset = getPreset()
      gui.revert()
    })
    if (window.innerWidth < 600) {
      gui.close()
    }
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

  eval(fx, fy, fz, fw) {
    const getFunction = f => {
      try {
        return new Function(
          'u',
          'v',
          'w',
          `
        const {
      E, LN2, LN10, LOG2E, LOG10E, PI, SQRT1_2, SQRT2, abs, acos, acosh, asin, asinh, atan, atan2, atanh, cbrt, ceil, clz32, cos, cosh, exp, expm1, floor, fround, hypot, imul, log, log1p, log2, log10, max, min, pow, random, round, sign, sin, sinh, sqrt, tan, tanh, trunc,
    } = Math
    try {
      return ${f}
    } catch (e) {
      return 0
    }
    `
        )
      } catch (e) {
        return () => 0
      }
    }
    const Fx = getFunction(fx)
    const Fy = getFunction(fy)
    const Fz = getFunction(fz)
    const Fw = getFunction(fw)

    return (u, v, w) => {
      return [Fx(u, v, w), Fy(u, v, w), Fz(u, v, w), Fw(u, v, w)]
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
    this.hyperMesh.cellSize =
      this.hyperEdges.cellSize =
      this.hyperPoints.cellSize =
        this.settings.cellSize
    this.hyperMesh.visible = this.settings.cells.visible
    this.hyperMesh.scale.setScalar(this.settings.scale)
    this.hyperMesh.materials.map(material => {
      material.opacity = this.settings.cells.opacity
      material.blending = +this.settings.cells.blending
      material.transparent = this.settings.cells.opacity < 1
      material.depthWrite = this.settings.cells.depthWrite
      material.wireframe = this.settings.cells.wireframe
    })
    this.hyperEdges.visible = this.settings.edges.visible
    this.hyperEdges.scale.setScalar(this.settings.scale)
    this.hyperEdges.materials.map(material => {
      material.opacity = this.settings.edges.opacity
      material.blending = +this.settings.edges.blending
      material.transparent = this.settings.edges.opacity < 1
      material.linewidth = this.settings.edges.linewidth
      material.depthWrite = this.settings.edges.depthWrite
    })
    this.hyperPoints.visible = this.settings.vertices.visible
    this.hyperPoints.scale.setScalar(this.settings.scale)
    this.hyperPoints.materials.map(material => {
      material.uniforms.opacity.value = this.settings.vertices.opacity
      material.uniforms.size.value = this.settings.vertices.size
    })
  }

  render() {
    // requestAnimationFrame(this.render.bind(this))
    // Updates
    this.stats.update()

    this.updateSettings()

    this.hyperRenderer.rotate(this.settings.rotationSpeed)
    this.hyperMesh.update()
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
window.anakata.renderer.setAnimationLoop(
  window.anakata.render.bind(window.anakata)
)
