import { GUI } from '../_snowpack/pkg/dat.gui.js'
import {
  HyperMesh,
  HyperRendererCached,
  shapes,
  normalizeShape,
  HyperSlice,
  uniformColors,
  cellColors,
  faceColors,
  wDepthColors,
  depthColors,
} from '../_snowpack/pkg/four-js.js'
import Stats from '../_snowpack/pkg/statsjs.js'
import {
  AdditiveBlending,
  AmbientLight,
  CustomBlending,
  DoubleSide,
  LineBasicMaterial,
  MeshLambertMaterial,
  MeshPhongMaterial,
  MultiplyBlending,
  NoBlending,
  NormalBlending,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  SubtractiveBlending,
  WebGLRenderer,
  sRGBEncoding,
  MeshBasicMaterial,
  MeshNormalMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  TextureLoader,
  EquirectangularReflectionMapping,
  EquirectangularRefractionMapping,
  MixOperation,
} from '../_snowpack/pkg/three.js'
import { OrbitControls } from '../_snowpack/pkg/three/examples/jsm/controls/OrbitControls.js'
import { Axes } from './axes.js'
import COLORS from './colors.js'
import presets from './presets.js'

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

const MATERIALS = {
  basic: MeshBasicMaterial,
  lambert: MeshLambertMaterial,
  normal: MeshNormalMaterial,
  phong: MeshPhongMaterial,
  physical: MeshPhysicalMaterial,
  standard: MeshStandardMaterial,
}
const PROPS_FOR_MATERIALS = {
  basic: ['reflectivity', 'refractionRatio'],
  lambert: ['reflectivity', 'refractionRatio'],
  normal: [],
  phong: ['reflectivity', 'refractionRatio', 'shininess'],
  physical: [
    'reflectivity',
    'refractionRatio',
    'metalness',
    'roughness',
    'transmission',
    'clearcoat',
    'clearcoatRoughness',
  ],
  standard: ['refractionRatio', 'metalness', 'roughness'],
}
// From: https://texturify.com/category/environment-panoramas.html
const ENVS = ['none', 'ocean', 'park', 'sunset', 'windows']

const COLOR_GENERATORS = {
  uniform: uniformColors,
  cell: cellColors,
  face: faceColors,
  wDepth: wDepthColors,
  depth: depthColors,
}

class Main {
  constructor() {
    const remembered =
      presets.remembered[preset] || Object.values(presets.remembered)[0]
    this.settings = {
      ...{ ...remembered[0] },
      rotation: { ...remembered[1] },
      rotationSpeed: { ...remembered[2] },
      slice: { ...remembered[3] },
      cells: { ...remembered[4] },
      edges: { ...remembered[5] },
      vertices: { ...remembered[6] },
    }
    this.texture = this.initTexture()

    this.stats = new Stats()
    this.showStats = false
    this.scene = new Scene()

    this.renderer = this.initRenderer()
    this.hyperRenderer = new HyperRendererCached(
      (this.settings.wFov * Math.PI) / 180,
      5,
      this.settings.rotation
    )
    this.camera = this.initCamera()
    this.controls = this.initControls()
    this.initLights()
    this.shape = this.getShape()

    if (this.settings.environment === 'none') {
      this.scene.background = null
    } else {
      this.scene.background = this.texture
    }

    this.gui = this.initGui()
    this.hyperMesh = this.initHyperMesh()
    this.selectedCells = []
    this.hoveredCell = null
    this.rayCaster = new Raycaster()
    this.axes = this.initAxes()

    this.setupDom()
  }

  initTexture() {
    const { environment } = this.settings
    this.loader = new TextureLoader()
    this.textures = {}
    const texture = this.loader.load(`envs/${environment}.jpg`, () => {
      // Preload other textures
      ENVS.filter(env => env !== environment).map(env => {
        this.loader.load(`envs/${env}.jpg`, texture => {
          texture.encoding = sRGBEncoding
          texture.mapping = this.settings.cells.refraction
            ? EquirectangularRefractionMapping
            : EquirectangularReflectionMapping
          this.textures[env] = texture
        })
      })
    })
    texture.encoding = sRGBEncoding
    texture.mapping = this.settings.cells.refraction
      ? EquirectangularRefractionMapping
      : EquirectangularReflectionMapping
    this.textures[environment] = texture
    return texture
  }

  initRenderer() {
    const renderer = new WebGLRenderer({
      antialias: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true

    return renderer
  }
  initCamera() {
    const camera = new PerspectiveCamera(
      this.settings.zFov,
      window.innerWidth / window.innerHeight,
      0.1,
      20
    )
    camera.position.set(0, 1.6, 1)
    camera.zoom = Math.min(1, window.innerWidth / window.innerHeight)
    camera.updateProjectionMatrix()
    this.scene.add(camera)

    return camera
  }
  initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.minDistance = 1
    controls.maxDistance = 10
    controls.target.set(0, 1.6, -1)
    controls.update()
    return controls
  }
  initLights() {
    const ambientLight = new AmbientLight(0x222222)
    this.scene.add(ambientLight)

    const pointLight = new PointLight(0xffffff, 1)
    pointLight.position.set(-0.6, 0.8, 5)
    this.camera.add(pointLight)
  }
  initHyperMesh() {
    const colors = COLORS[this.settings.colors].slice(1)
    const MeshMaterial = MATERIALS[this.settings.cells.material]

    const extraProps = Object.fromEntries(
      [
        'reflectivity',
        'refractionRatio',
        'shininess',
        'metalness',
        'roughness',
        'transmission',
        'clearcoat',
        'clearcoatRoughness',
      ]
        .filter(key =>
          PROPS_FOR_MATERIALS[this.settings.cells.material].includes(key)
        )
        .map(key => [key, this.settings.cells[key]])
    )

    if (this.settings.cells.material !== 'normal') {
      extraProps.envMap = this.settings.cells.reflectivity ? this.texture : null
    }
    if (['basic', 'lambert', 'phong'].includes(this.settings.cells.material)) {
      extraProps.combine = MixOperation
    }
    const object = new (
      this.settings.mode === 'projection' ? HyperMesh : HyperSlice
    )(this.shape, {
      faces: {
        enabled: true,
        colors,
        colorGenerator: COLOR_GENERATORS[this.settings.cells.colorGenerator],
        reuse: this.settings.cells.reuse,
        split: this.settings.cells.split,
        material: new MeshMaterial({
          side: DoubleSide,
          vertexColors: true,
          ...Object.fromEntries(
            [
              'opacity',
              'transparent',
              'premultipliedAlpha',
              'blending',
              'wireframe',
              'depthWrite',
            ].map(key => [
              key,
              key === 'blending'
                ? +this.settings.cells[key]
                : this.settings.cells[key],
            ])
          ),
          ...extraProps,
        }),
      },
      edges: {
        enabled: true,
        colors,
        colorGenerator: COLOR_GENERATORS[this.settings.edges.colorGenerator],
        reuse: this.settings.edges.reuse,
        split: this.settings.edges.split,
        material: new LineBasicMaterial({
          vertexColors: true,
          ...Object.fromEntries(
            [
              'opacity',
              'transparent',
              'blending',
              'linewidth',
              'depthWrite',
            ].map(key => [
              key,
              key === 'blending'
                ? +this.settings.edges[key]
                : this.settings.edges[key],
            ])
          ),
        }),
      },
      points: {
        enabled: true,
        colors,
        colorGenerator: COLOR_GENERATORS[this.settings.vertices.colorGenerator],
        reuse: this.settings.vertices.reuse,
        split: this.settings.vertices.split,
      },
    })

    object.config.points.material.uniforms.opacity.value =
      this.settings.vertices.opacity
    object.config.points.material.uniforms.size.value =
      this.settings.vertices.size

    // TODO: handle this in four.js
    object.config.faces.enabled = object.faces.visible =
      this.settings.cells.visible
    object.config.edges.enabled = object.edges.visible =
      this.settings.edges.visible
    object.config.points.enabled = object.points.visible =
      this.settings.vertices.visible

    object.config.faces.splitScale =
      object.config.edges.splitScale =
      object.config.points.splitScale =
        this.settings.splitScale

    object.scale.setScalar(this.settings.scale)
    object.position.set(0, 1.6, -1)
    this.scene.add(object)
    return object
  }

  switchHyperMesh() {
    if (this.reverting) {
      return
    }
    this.scene.remove(this.hyperMesh)

    this.shape = this.getShape()
    this.hyperMesh = this.initHyperMesh()
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
    let shape
    if (!this.settings.shape.startsWith('generate')) {
      shape = shapes[this.settings.shape]
    } else if (this.settings.shape === 'generateUVWHyperSurface') {
      shape = shapes[this.settings.shape](
        this.eval(fx, fy, fz, fw),
        [uMin, uMax, uResolution, uInclusive, uLoop],
        [vMin, vMax, vResolution, vInclusive, vLoop],
        [wMin, wMax, wResolution, wInclusive, wLoop],
        { u: withUCells, v: withVCells, w: withWCells }
      )
    } else if (this.settings.shape === 'generateUVSurface') {
      shape = shapes[this.settings.shape](
        this.eval(fx, fy, fz, fw),
        [uMin, uMax, uResolution, uInclusive, uLoop],
        [vMin, vMax, vResolution, vInclusive, vLoop]
      )
    }
    shape = normalizeShape(shape)
    return shape
  }

  initAxes() {
    const axes = {
      scene: new Scene(),
      camera: new PerspectiveCamera(this.settings.zFov, 1, 0.1, 2),
      size: 100,
      axes: new Axes(this.hyperRenderer, 1, [0, 1.6, -1]),
    }
    axes.camera.updateProjectionMatrix()

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

    gui.remember(this.settings)
    gui.remember(this.settings.rotation)
    gui.remember(this.settings.rotationSpeed)
    gui.remember(this.settings.slice)
    gui.remember(this.settings.cells)
    gui.remember(this.settings.edges)
    gui.remember(this.settings.vertices)

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
    const main = gui.addFolder('Main config')
    main
      .add(
        this.settings,
        'shape',
        Object.keys(shapes).filter(
          name =>
            !name.startsWith('generate') ||
            ['generateUVSurface', 'generateUVWHyperSurface'].includes(name)
        )
      )
      .onChange(v => {
        uvw[v.startsWith('generate') ? 'show' : 'hide']()
        w[v === 'generateUVWHyperSurface' ? 'show' : 'hide']()
        this.controls.reset()
        this.controls.target.set(0, 1.6, -1)
        this.controls.update()
        this.switchHyperMesh()
      })

    const uvw = gui.addFolder('UVW parameters')
    uvw[this.settings.shape.startsWith('generate') ? 'show' : 'hide']()
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
    const u = uvw.addFolder('U')
    u.add(this.settings, 'uMin', -1000, 1000, 0.001).onChange(
      this.switchHyperMesh.bind(this)
    )
    u.add(this.settings, 'uMax', -1000, 1000, 0.001).onChange(
      this.switchHyperMesh.bind(this)
    )
    u.add(this.settings, 'uResolution', 0, 128, 1).onChange(
      this.switchHyperMesh.bind(this)
    )
    u.add(this.settings, 'uInclusive', false).onChange(
      this.switchHyperMesh.bind(this)
    )
    u.add(this.settings, 'uLoop', false).onChange(
      this.switchHyperMesh.bind(this)
    )
    u.add(this.settings, 'withUCells', true).onChange(
      this.switchHyperMesh.bind(this)
    )
    const v = uvw.addFolder('V')
    v.add(this.settings, 'vMin', -1000, 1000, 0.001).onChange(
      this.switchHyperMesh.bind(this)
    )
    v.add(this.settings, 'vMax', -1000, 1000, 0.001).onChange(
      this.switchHyperMesh.bind(this)
    )
    v.add(this.settings, 'vResolution', 0, 128, 1).onChange(
      this.switchHyperMesh.bind(this)
    )
    v.add(this.settings, 'vInclusive', false).onChange(
      this.switchHyperMesh.bind(this)
    )
    v.add(this.settings, 'vLoop', false).onChange(
      this.switchHyperMesh.bind(this)
    )
    v.add(this.settings, 'withVCells', true).onChange(
      this.switchHyperMesh.bind(this)
    )
    const w = uvw.addFolder('W')
    w.add(this.settings, 'wMin', -1000, 1000, 0.001).onChange(
      this.switchHyperMesh.bind(this)
    )
    w.add(this.settings, 'wMax', -1000, 1000, 0.001).onChange(
      this.switchHyperMesh.bind(this)
    )
    w.add(this.settings, 'wResolution', 0, 128, 1).onChange(
      this.switchHyperMesh.bind(this)
    )
    w.add(this.settings, 'wInclusive', false).onChange(
      this.switchHyperMesh.bind(this)
    )
    w.add(this.settings, 'wLoop', false).onChange(
      this.switchHyperMesh.bind(this)
    )
    w.add(this.settings, 'withWCells', true).onChange(
      this.switchHyperMesh.bind(this)
    )

    main
      .add(this.settings, 'colors', Object.keys(COLORS))
      .onChange(this.switchHyperMesh.bind(this))
    main.add(this.settings, 'environment', ENVS).onChange(environment => {
      this.texture = this.textures[environment]
      this.texture.encoding = sRGBEncoding
      this.texture.mapping = this.settings.cells.refraction
        ? EquirectangularRefractionMapping
        : EquirectangularReflectionMapping
      this.hyperMesh.config.faces.material.envMap = this.settings.cells
        .reflectivity
        ? this.texture
        : null
      this.hyperMesh.config.faces.material.needsUpdate = true
      if (environment === 'none') {
        this.scene.background = null
      } else {
        this.scene.background = this.texture
      }
    })

    main
      .add(this.settings, 'mode', ['projection', 'cross-section'])
      .onChange(this.switchHyperMesh.bind(this))
    main.add(this.settings, 'zFov', 0, 180).onChange(v => {
      this.axes.camera.fov = this.camera.fov = v
      this.camera.updateProjectionMatrix()
      this.axes.camera.updateProjectionMatrix()
    })
    main.add(this.settings, 'wFov', 0, 180).onChange(v => {
      this.hyperRenderer.fov = (v * Math.PI) / 180
    })
    main.add(this.settings, 'splitScale', 0, 99.9, 0.1).onChange(v => {
      this.hyperMesh.config.faces.splitScale =
        this.hyperMesh.config.edges.splitScale =
        this.hyperMesh.config.points.splitScale =
          v
    })
    main.add(this.settings, 'scale', 0, 20, 0.1).onChange(v => {
      this.hyperMesh.scale.setScalar(v)
    })

    main
      .add(this, 'showStats')
      .onChange(v => this.stats.showPanel(v ? 0 : null))

    const transformations = gui.addFolder('Transformations')
    const rot = transformations.addFolder('4d rotation')
    PLANES.forEach(k => {
      rot.add(this.settings.rotation, k, 0, 2 * Math.PI, 0.01).listen()
    })
    const rotSpeed = transformations.addFolder('4d rotation speed')
    PLANES.forEach(k => {
      rotSpeed.add(this.settings.rotationSpeed, k, 0, 50, 0.01)
    })

    const slice = transformations.addFolder('Slice')
    slice.add(this.settings.slice, 'slice', -1, 1, 0.01).listen()
    slice.add(this.settings.slice, 'speed', 0, 10, 0.1)

    const that = this
    const updateMaterial = (type, needsUpdate) =>
      function (v) {
        if (this.property === 'blending') {
          v = +v
        }
        that.hyperMesh.config[type].material[this.property] = v
        needsUpdate && (that.hyperMesh.config[type].material.needsUpdate = true)
      }
    const rendering = gui.addFolder('Rendering')
    rendering
      .add(this.settings.cells, 'visible')
      .name('Cells')
      .onChange(v => {
        this.hyperMesh.config.faces.enabled = this.hyperMesh.faces.visible = v
        cells[v ? 'show' : 'hide']()
      })
    rendering
      .add(this.settings.edges, 'visible')
      .name('Edges')
      .onChange(v => {
        this.hyperMesh.config.edges.enabled = this.hyperMesh.edges.visible = v
        edges[v ? 'show' : 'hide']()
      })
    rendering
      .add(this.settings.vertices, 'visible')
      .name('Points')
      .onChange(v => {
        this.hyperMesh.config.points.enabled = this.hyperMesh.points.visible = v
        vertices[v ? 'show' : 'hide']()
      })
    const cells = rendering.addFolder('Cells')
    cells
      .add(this.settings.cells, 'transparent')
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'opacity', 0, 1)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'premultipliedAlpha')
      .onChange(updateMaterial('faces', true))
    cells
      .add(this.settings.cells, 'colorGenerator', Object.keys(COLOR_GENERATORS))
      .onChange(this.switchHyperMesh.bind(this))
    cells
      .add(this.settings.cells, 'blending', BLENDINGS)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'material', Object.keys(MATERIALS))
      .onChange(this.switchHyperMesh.bind(this))
    cells.add(this.settings.cells, 'reflectivity', 0, 1, 0.01).onChange(v => {
      this.hyperMesh.config.faces.material.reflectivity = v
      if (v && !this.hyperMesh.config.faces.material.envMap) {
        this.hyperMesh.config.faces.material.envMap = this.texture
        this.hyperMesh.config.faces.material.needsUpdate = true
      }
      if (!v && this.hyperMesh.config.faces.material.envMap) {
        this.hyperMesh.config.faces.material.envMap = null
        this.hyperMesh.config.faces.material.needsUpdate = true
      }
    })
    cells
      .add(this.settings.cells, 'refractionRatio', 0, 1, 0.01)
      .onChange(v => {
        this.hyperMesh.config.faces.material.refractionRatio = v
        if (!this.texture) {
          return
        }
        this.texture.mapping = v
          ? EquirectangularRefractionMapping
          : EquirectangularReflectionMapping
        this.hyperMesh.config.faces.material.needsUpdate = true
      })
    cells
      .add(this.settings.cells, 'shininess', 0, 150)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'metalness', 0, 1, 0.01)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'roughness', 0, 1, 0.01)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'transmission', 0, 1, 0.01)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'clearcoat', 0, 1, 0.01)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'clearcoatRoughness', 0, 1, 0.01)
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'depthWrite')
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'wireframe')
      .onChange(updateMaterial('faces'))
    cells
      .add(this.settings.cells, 'reuse', ['all', 'faces', 'none'])
      .onChange(this.switchHyperMesh.bind(this))
    cells
      .add(this.settings.cells, 'split', ['none', 'cells', 'faces'])
      .onChange(this.switchHyperMesh.bind(this))
    cells[this.settings.cells.visible ? 'show' : 'hide']()

    const edges = rendering.addFolder('Edges')
    edges
      .add(this.settings.edges, 'transparent')
      .onChange(updateMaterial('edges'))
    edges
      .add(this.settings.edges, 'opacity', 0, 1)
      .onChange(updateMaterial('edges'))
    edges
      .add(this.settings.edges, 'colorGenerator', Object.keys(COLOR_GENERATORS))
      .onChange(this.switchHyperMesh.bind(this))
    edges
      .add(this.settings.edges, 'blending', BLENDINGS)
      .onChange(updateMaterial('edges'))
    edges
      .add(this.settings.edges, 'linewidth', 0, 5)
      .onChange(updateMaterial('edges'))
    edges
      .add(this.settings.edges, 'depthWrite')
      .onChange(updateMaterial('edges'))
    edges
      .add(this.settings.edges, 'reuse', ['all', 'faces', 'none'])
      .onChange(this.switchHyperMesh.bind(this))
    edges
      .add(this.settings.edges, 'split', ['none', 'cells', 'faces'])
      .onChange(this.switchHyperMesh.bind(this))
    edges[this.settings.edges.visible ? 'show' : 'hide']()

    const vertices = rendering.addFolder('Vertices')
    vertices
      .add(this.settings.vertices, 'transparent')
      .onChange(updateMaterial('points'))
    vertices.add(this.settings.vertices, 'opacity', 0, 1).onChange(v => {
      this.hyperMesh.config.points.material.uniforms.opacity.value = v
    })
    vertices
      .add(
        this.settings.vertices,
        'colorGenerator',
        Object.keys(COLOR_GENERATORS)
      )
      .onChange(this.switchHyperMesh.bind(this))
    vertices.add(this.settings.vertices, 'size', 0, 5, 0.1).onChange(v => {
      this.hyperMesh.config.points.material.uniforms.size.value = v
    })
    vertices
      .add(this.settings.vertices, 'reuse', ['all', 'faces', 'none'])
      .onChange(this.switchHyperMesh.bind(this))
    vertices
      .add(this.settings.vertices, 'split', ['none', 'cells', 'faces'])
      .onChange(this.switchHyperMesh.bind(this))

    vertices[this.settings.vertices.visible ? 'show' : 'hide']()

    gui.__preset_select.addEventListener('change', ({ target: { value } }) => {
      location.hash = `#${encodeURIComponent(value)}`
    })
    window.addEventListener('hashchange', () => {
      if (gui.preset !== getPreset()) {
        gui.preset = getPreset()
      }
    })
    if (window.innerWidth < 600) {
      gui.close()
    }
    const oldRevert = gui.revert.bind(gui)
    gui.revert = () => {
      this.reverting = true
      oldRevert()
      this.reverting = false
      this.switchHyperMesh()
    }
    return gui
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
    document.body.style.margin = 0
    document.body.style.overflow = 'hidden'
    document.body.appendChild(this.renderer.domElement)
    document.body.appendChild(this.stats.dom)
    this.stats.showPanel(null)
    window.addEventListener('resize', this.onResize.bind(this), false)
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.zoom = Math.min(1, window.innerWidth / window.innerHeight)
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  render() {
    this.showStats && this.stats.update()

    this.hyperRenderer.rotate(this.settings.rotationSpeed)
    if (this.settings.mode === 'cross-section') {
      if (this.settings.slice.speed) {
        this.hyperRenderer.shiftSlice(this.settings.slice.speed, -1, 1)
        this.settings.slice.slice = this.hyperRenderer.wSlice
      } else {
        if (this.settings.slice.slice !== this.hyperRenderer.wSlice) {
          this.hyperRenderer.wSlice = this.settings.slice.slice
        }
      }
    }
    this.hyperMesh.update(this.hyperRenderer)

    this.axes.camera.position.copy(this.camera.position)
    this.axes.camera.quaternion.copy(this.camera.quaternion)
    this.axes.axes.update()

    // Rendering

    // Render scene
    const clearColor = COLORS[this.settings.colors][0]
    this.renderer.setClearColor(clearColor || 0x000000, 1)
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
