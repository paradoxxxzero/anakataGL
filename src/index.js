import { ConvexBufferGeometry } from 'three/examples/jsm/geometries/ConvexGeometry'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {
  Scene,
  PerspectiveCamera,
  Mesh,
  WebGLRenderer,
  AmbientLight,
  PointLight,
  AxesHelper,
  TextureLoader,
  BackSide,
  FrontSide,
  BufferGeometry,
  Points,
  Group,
  MeshLambertMaterial,
  PointsMaterial,
  Vector3,
} from 'three'

import { Axes } from './axes'
import { HyperRenderer } from './hyperRenderer'
import { Tesseract } from './tesseract'
import { genVertices } from './vertices'
import disc from './disc.png'

document.body.style.margin = 0

const scene = new Scene()

const renderer = new WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const hyperRenderer = new HyperRenderer(1, 5)

const camera = new PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  1,
  1000
)
camera.position.set(5, 5, 5)
scene.add(camera)

const controls = new OrbitControls(camera, renderer.domElement)
controls.minDistance = 2
controls.maxDistance = 50
controls.maxPolarAngle = Math.PI / 2

const ambientLight = new AmbientLight(0x222222)
scene.add(ambientLight)

const pointLight = new PointLight(0xffffff, 1)
camera.add(pointLight)
//
// var loader = new TextureLoader()
// var texture = loader.load(disc)
//
// group = new Group()
// scene.add(group)
const axes = new Axes(hyperRenderer, 2)
scene.add(axes.group)
const tesseract = new Tesseract(hyperRenderer)
scene.add(tesseract.group)
//
// var vertices = genVertices(4)
//   .map(project)
//   .map(l => new Vector3(...l))
//
// var pointsMaterial = new PointsMaterial({
//   color: 0x0080ff,
//   map: texture,
//   size: 1,
//   alphaTest: 0.5,
// })
//
// var pointsGeometry = new BufferGeometry().setFromPoints(vertices)
//
// var points = new Points(pointsGeometry, pointsMaterial)
// group.add(points)
//
// // convex hull
//
// var meshMaterial = new MeshLambertMaterial({
//   color: 0x00ffff,
//   opacity: 0.5,
//   transparent: true,
// })
//
// var meshGeometry = new ConvexBufferGeometry(vertices)
//
// var mesh = new Mesh(meshGeometry, meshMaterial)
// mesh.material.side = BackSide // back faces
// mesh.renderOrder = 0
// group.add(mesh)
//
// mesh = new Mesh(meshGeometry, meshMaterial.clone())
// mesh.material.side = FrontSide // front faces
// mesh.renderOrder = 1
// group.add(mesh)

window.addEventListener(
  'resize',
  () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
  },
  false
)

function animate() {
  requestAnimationFrame(animate)
  hyperRenderer.rotate({
    xy: 0.002,
    xz: 0.003,
    xw: 0.005,
    yz: 0.007,
    yw: 0.011,
    zw: 0.013,
  })
  axes.update()
  tesseract.update()

  renderer.render(scene, camera)
}
animate()

window.axes = axes
