// Re-center
const center = new Vector3()
this.mesh.geometry.computeBoundingBox()
this.mesh.geometry.boundingBox.getCenter(center)
this.mesh.geometry.center()
this.mesh.position.copy(center)

const cb = new Vector3()
const ab = new Vector3()

this.mesh.geometry.faces.forEach(face => {
  const { vertices } = this.mesh.geometry
  const vA = vertices[face.a]
  const vB = vertices[face.b]
  const vC = vertices[face.c]
  const center = new Vector3()
  center
    .add(vA)
    .add(vB)
    .add(vC)
    .divideScalar(3)
  cb.subVectors(vC, vB)
  ab.subVectors(vA, vB)
  cb.cross(ab)
  cb.normalize()
  // if (center.angleTo(cb) < Math.PI / 2) {
  //   cb.negate()
  // }

  face.normal.copy(cb)
  if (face.vertexNormals.length === 3) {
    face.vertexNormals[0].copy(cb)
    face.vertexNormals[1].copy(cb)
    face.vertexNormals[2].copy(cb)
  } else {
    face.vertexNormals[0] = cb.clone()
    face.vertexNormals[1] = cb.clone()
    face.vertexNormals[2] = cb.clone()
  }
})
