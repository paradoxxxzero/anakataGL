import { B as BufferGeometry, a as BufferAttribute, D as DynamicDrawUsage, G as Group, M as Mesh, V as Vector3 } from './common/three.module-5e57e5f8.js';

class HyperEdgeGeometry {
  constructor(vertices, faces, cells, hyperRenderer) {
    this.vertices = vertices;
    this.faces = faces;
    this.cells = cells;
    this.hyperRenderer = hyperRenderer;

    this.geometries = this.cells.map(cell => {
      const faces = cell.map(faceIndex => this.faces[faceIndex]);

      const verticesCount = faces.reduce(
        (sum, face) => sum + face.length * 2,
        0
      );

      const positions = new Float32Array(verticesCount * 3);

      let pos = 0;
      faces.forEach(face => {
        // Project points
        face
          .map((verticeIndex, i) => [
            this.vertices[verticeIndex],
            this.vertices[face[(i + 1) % face.length]],
          ])
          .flat()
          .forEach(vertice => {
            const [x, y, z] = this.hyperRenderer.project(vertice);
            positions[pos++] = x;
            positions[pos++] = y;
            positions[pos++] = z;
          });
      });

      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage)
      );
      return geometry
    });
  }

  update() {
    this.cells.map((cell, cellIndex) => {
      const geometry = this.geometries[cellIndex];

      let pos = 0;
      cell
        .map(faceIndex => this.faces[faceIndex])
        .forEach(face => {
          face
            .map((verticeIndex, i) => [
              this.vertices[verticeIndex],
              this.vertices[face[(i + 1) % face.length]],
            ])
            .flat()
            .forEach(vertice => {
              const [x, y, z] = this.hyperRenderer.project(vertice);
              geometry.attributes.position.array[pos++] = x;
              geometry.attributes.position.array[pos++] = y;
              geometry.attributes.position.array[pos++] = z;
            });
        });

      geometry.attributes.position.needsUpdate = true;
    });
  }
}

class HyperGeometry {
  constructor(vertices, faces, cells, hyperRenderer) {
    this.vertices = vertices;
    this.faces = faces;
    this.cells = cells;
    this.hyperRenderer = hyperRenderer;

    this.geometries = this.cells.map(cell => {
      const faces = cell.map(faceIndex => this.faces[faceIndex]);

      const verticesCount = faces.reduce((sum, face) => sum + face.length, 0);

      const positions = new Float32Array(verticesCount * 3);
      const indices = [];

      let pos = 0;
      let faceShift = 0;
      faces.forEach(face => {
        // Project points
        face
          .map(verticeIndex => this.vertices[verticeIndex])
          .forEach(vertice => {
            const [x, y, z] = this.hyperRenderer.project(vertice);
            positions[pos++] = x;
            positions[pos++] = y;
            positions[pos++] = z;
          });

        // Tesselate face
        new Array(face.length - 2).fill().forEach((_, i) => {
          indices.push(faceShift, faceShift + i + 1, faceShift + i + 2);
        });

        faceShift += face.length;
      });

      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage)
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry
    });
  }

  update() {
    this.cells.map((cell, cellIndex) => {
      const geometry = this.geometries[cellIndex];

      let pos = 0;
      cell
        .map(faceIndex => this.faces[faceIndex])
        .forEach(face => {
          face
            .map(verticeIndex => this.vertices[verticeIndex])
            .forEach(vertice => {
              const [x, y, z] = this.hyperRenderer.project(vertice);
              geometry.attributes.position.array[pos++] = x;
              geometry.attributes.position.array[pos++] = y;
              geometry.attributes.position.array[pos++] = z;
            });
        });

      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.attributes.normal.needsUpdate = true;
    });
  }
}

class HyperMesh extends Group {
  constructor(hyperGeometry, materials, MeshClass = Mesh) {
    super();
    this.cellSize = 100;

    this.hyperGeometry = hyperGeometry;
    this.materials = Array.isArray(materials)
      ? materials
      : Array(this.hyperGeometry.geometries.length).fill(materials);

    this.add(
      ...this.hyperGeometry.geometries.map(
        (geometry, i) => new MeshClass(geometry, this.materials[i])
      )
    );
  }

  update() {
    this.hyperGeometry.update();

    this.children.map(mesh => {
      const center = new Vector3();
      mesh.geometry.computeBoundingBox();
      mesh.geometry.boundingBox.getCenter(center);
      mesh.geometry.center();
      mesh.position.copy(center);
      mesh.scale.setScalar(Math.min(this.cellSize / 100, 0.999));
    });
  }
}

class HyperPointsGeometry {
  constructor(vertices, faces, cells, hyperRenderer) {
    this.vertices = vertices;
    this.faces = faces;
    this.cells = cells;
    this.hyperRenderer = hyperRenderer;

    this.geometries = this.cells.map(cell => {
      const allVertices = [
        ...new Set(
          cell
            .map(faceIndex =>
              this.faces[faceIndex].map(
                verticeIndex => this.vertices[verticeIndex]
              )
            )
            .flat()
        ),
      ];

      const positions = new Float32Array(allVertices.length * 3);

      let pos = 0;
      allVertices.forEach(vertice => {
        const [x, y, z] = this.hyperRenderer.project(vertice);
        positions[pos++] = x;
        positions[pos++] = y;
        positions[pos++] = z;
      });

      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new BufferAttribute(positions, 3).setUsage(DynamicDrawUsage)
      );
      return geometry
    });
  }

  update() {
    this.cells.map((cell, cellIndex) => {
      const geometry = this.geometries[cellIndex];
      const allVertices = [
        ...new Set(
          cell
            .map(faceIndex =>
              this.faces[faceIndex].map(
                verticeIndex => this.vertices[verticeIndex]
              )
            )
            .flat()
        ),
      ];
      let pos = 0;
      allVertices.forEach(vertice => {
        const [x, y, z] = this.hyperRenderer.project(vertice);
        geometry.attributes.position.array[pos++] = x;
        geometry.attributes.position.array[pos++] = y;
        geometry.attributes.position.array[pos++] = z;
      });

      geometry.attributes.position.needsUpdate = true;
    });
  }
}

class HyperRenderer {
  constructor(fov, w, initialRotation) {
    this.fov = fov || Math.PI / 2;
    this.w = w || 10; // Camera ana

    this.rotation = initialRotation || {
      xy: 0,
      xz: 0,
      xw: 0,
      yz: 0,
      yw: 0,
      zw: 0,
    };
  }

  project([xo, yo, zo, wo]) {
    const [x, y, z, w] = this.rotatePoint([xo, yo, zo, wo]);
    const zoom = 1 + (w * this.fov) / this.w;
    return [x / zoom, y / zoom, z / zoom]
  }

  rotate(delta) {
    Object.keys(this.rotation).forEach(k => {
      this.rotation[k] =
        (this.rotation[k] + (delta[k] || 0) / 1000) % (2 * Math.PI);
    });
  }

  rotatePoint([x, y, z, w]) {
    const { xy, xz, xw, yz, yw, zw } = this.rotation;
    const cxy = Math.cos(xy);
    const sxy = Math.sin(xy);
    const cxz = Math.cos(xz);
    const sxz = Math.sin(xz);
    const cxw = Math.cos(xw);
    const sxw = Math.sin(xw);
    const cyz = Math.cos(yz);
    const syz = Math.sin(yz);
    const cyw = Math.cos(yw);
    const syw = Math.sin(yw);
    const czw = Math.cos(zw);
    const szw = Math.sin(zw);

    let t = x;
    x = x * cxy + y * sxy;
    y = y * cxy - t * sxy;
    t = x;
    x = x * cxz + z * sxz;
    z = z * cxz - t * sxz;
    t = x;
    x = x * cxw + w * sxw;
    w = w * cxw - t * sxw;
    t = y;
    y = y * cyz + z * syz;
    z = z * cyz - t * syz;
    t = y;
    y = y * cyw + w * syw;
    w = w * cyw - t * syw;
    t = z;
    z = z * czw + w * szw;
    w = w * czw - t * szw;
    return [x, y, z, w]
  }
}

var hexadecachoron = {
  vertices: [
    [-1, 0, 0, 0], // 0
    [1, 0, 0, 0], // 1
    [0, -1, 0, 0], // 2
    [0, 1, 0, 0], // 3
    [0, 0, -1, 0], // 4
    [0, 0, 1, 0], // 5
    [-0, 0, 0, -1], // 6
    [0, 0, 0, 1], // 7
  ],
  faces: [
    [0, 2, 4], // 0
    [0, 2, 5], // 1
    [0, 2, 6], // 2
    [0, 2, 7], // 3
    [0, 3, 4], // 4
    [0, 3, 5], // 5
    [0, 3, 6], // 6
    [0, 3, 7], // 7
    [0, 4, 6], // 8
    [0, 4, 7], // 9
    [0, 5, 6], // 10
    [0, 5, 7], // 11
    [1, 2, 4], // 12
    [1, 2, 5], // 13
    [1, 2, 6], // 14
    [1, 2, 7], // 15
    [1, 3, 4], // 16
    [1, 3, 5], // 17
    [1, 3, 6], // 18
    [1, 3, 7], // 19
    [1, 4, 6], // 20
    [1, 4, 7], // 21
    [1, 5, 6], // 22
    [1, 5, 7], // 23
    [2, 4, 6], // 24
    [2, 4, 7], // 25
    [2, 5, 6], // 26
    [2, 5, 7], // 27
    [3, 4, 6], // 28
    [3, 4, 7], // 29
    [3, 5, 6], // 30
    [3, 5, 7], // 31
  ],
  cells: [
    [0, 2, 8, 24], // 0  v: 0, 2, 4, 6
    [0, 3, 9, 25], // 1  v: 0, 2, 4, 7
    [1, 2, 10, 26], // 2  v: 0, 2, 5, 6
    [1, 3, 11, 27], // 3  v: 0, 2, 5, 7
    [4, 6, 8, 28], // 4  v: 0, 3, 4, 6
    [4, 7, 9, 29], // 5  v: 0, 3, 4, 7
    [5, 6, 10, 30], // 6  v: 0, 3, 5, 6
    [5, 7, 11, 31], // 7  v: 0, 3, 5, 7

    [12, 14, 20, 24], // 8  v: 1, 2, 4, 6
    [12, 15, 21, 25], // 9  v: 1, 2, 4, 7
    [13, 14, 22, 26], // 10  v: 1, 2, 5, 6
    [13, 15, 23, 27], // 11  v: 1, 2, 5, 7
    [16, 18, 20, 28], // 12  v: 1, 3, 4, 6
    [16, 19, 21, 29], // 13  v: 1, 3, 4, 7
    [17, 18, 22, 30], // 14  v: 1, 3, 5, 6
    [17, 19, 23, 31], // 15  v: 1, 3, 5, 7
  ],
};

var pentachoron = {
  vertices: [
    [1, 1, 1, -1 / Math.sqrt(5)], // 0
    [1, -1, -1, -1 / Math.sqrt(5)], // 1
    [-1, 1, -1, -1 / Math.sqrt(5)], // 2
    [-1, -1, 1, -1 / Math.sqrt(5)], // 3
    [0, 0, 0, Math.sqrt(5) - 1 / Math.sqrt(5)], // 4
  ],
  faces: [
    [1, 2, 3], // 0
    [0, 1, 2], // 1
    [0, 1, 3], // 2
    [0, 3, 2], // 3

    [0, 4, 1], // 4
    [0, 2, 4], // 5
    [0, 3, 4], // 6

    [2, 4, 3], // 7
    [1, 3, 4], // 8
    [1, 4, 2], // 9
  ],
  cells: [
    [0, 1, 2, 3], // 0
    [1, 5, 4, 9], // 1
    [3, 6, 5, 7], // 2
    [2, 4, 6, 8], // 3
    [0, 7, 8, 9], // 4
  ],
};

var tesseract = {
  vertices: [
    [1, 1, 1, 1], // 0
    [1, 1, -1, 1], // 1
    [1, -1, -1, 1], // 2
    [1, -1, 1, 1], // 3
    [-1, 1, 1, 1], // 4
    [-1, 1, -1, 1], // 5
    [-1, -1, -1, 1], // 6
    [-1, -1, 1, 1], // 7
    [1, 1, 1, -1], // 8
    [1, 1, -1, -1], // 9
    [1, -1, -1, -1], // 10
    [1, -1, 1, -1], // 11
    [-1, 1, 1, -1], // 12
    [-1, 1, -1, -1], // 13
    [-1, -1, -1, -1], // 14
    [-1, -1, 1, -1], // 15
  ],
  faces: [
    [0, 1, 2, 3], // 0
    [0, 4, 5, 1], // 1
    [0, 3, 7, 4], // 2
    [3, 2, 6, 7], // 3
    [1, 5, 6, 2], // 4
    [4, 7, 6, 5], // 5

    [0, 1, 9, 8], // 6
    [4, 5, 13, 12], // 7
    [3, 2, 10, 11], // 8
    [7, 6, 14, 15], // 9

    [0, 3, 11, 8], // 10
    [4, 7, 15, 12], // 11
    [1, 2, 10, 9], // 12
    [5, 6, 14, 13], // 13

    [0, 4, 12, 8], // 14
    [1, 5, 13, 9], // 15
    [2, 6, 14, 10], // 16
    [3, 7, 15, 11], // 17

    [11, 10, 9, 8], // 18
    [9, 13, 12, 8], // 19
    [12, 15, 11, 8], // 20
    [15, 14, 10, 11], // 21
    [10, 14, 13, 9], // 22
    [13, 14, 15, 12], // 23
  ],
  cells: [
    [0, 1, 2, 3, 4, 5], // 0
    [0, 6, 12, 8, 10, 18], // 1
    [1, 6, 14, 7, 15, 19], // 2
    [4, 12, 16, 13, 15, 22], // 3
    [3, 8, 16, 9, 17, 21], // 4
    [2, 10, 17, 11, 14, 20], // 5
    [5, 7, 13, 9, 11, 23], // 6
    [18, 19, 20, 21, 22, 23], // 7
  ],
};

function createSphere(radius, piResolution = 8) {
  const vertices = [];
  const faces = [];
  const cells = [];
  let facesIndex = 0;

  const classOfVertex = {
    theta: {},
    phi: {},
    gamma: {},
  };

  for (let theta = 0; theta <= piResolution; theta++) {
    for (let phi = 0; phi <= piResolution; phi++) {
      for (let gamma = 0; gamma < 2 * piResolution; gamma++) {
        //for (let gamma = 0; gamma < 2 * piResolution; gamma+=piResolution) {
        if (!classOfVertex.theta[theta]) {
          classOfVertex.theta[theta] = [];
        }
        if (!classOfVertex.phi[phi]) {
          classOfVertex.phi[phi] = [];
        }
        if (!classOfVertex.gamma[gamma]) {
          classOfVertex.gamma[gamma] = [];
        }

        classOfVertex.theta[theta].push(vertices.length);
        classOfVertex.phi[phi].push(vertices.length);
        classOfVertex.gamma[gamma].push(vertices.length);

        const thetaInPi = (theta * Math.PI) / piResolution;
        const phiInPi = (phi * Math.PI) / piResolution;
        const gammaInPi = (gamma * Math.PI) / piResolution;

        vertices.push([
          radius * Math.cos(thetaInPi),
          radius * Math.sin(thetaInPi) * Math.cos(phiInPi),
          radius *
            Math.sin(thetaInPi) *
            Math.sin(phiInPi) *
            Math.cos(gammaInPi),
          radius *
            Math.sin(thetaInPi) *
            Math.sin(phiInPi) *
            Math.sin(gammaInPi),
        ]);
      }
    }
  }

  for (let key in classOfVertex.theta) {
    const vertexClass = classOfVertex.theta[key];
    const cell = [];
    for (
      let rounds = 0;
      rounds < vertexClass.length / (piResolution * 2) - 1;
      rounds++
    ) {
      for (let i = 0; i < piResolution * 2; i++) {
        let iBase = rounds * piResolution * 2;
        let iBaseNext = (rounds + 1) * piResolution * 2;
        faces.push([
          vertexClass[iBase + i],
          vertexClass[iBase + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + (i % (piResolution * 2))],
        ]);
        cell.push(facesIndex);
        facesIndex++;
      }
    }
    cells.push(cell);
  }

  for (let key in classOfVertex.phi) {
    const vertexClass = classOfVertex.phi[key];
    const cell = [];
    for (
      let rounds = 0;
      rounds < vertexClass.length / (piResolution * 2) - 1;
      rounds++
    ) {
      for (let i = 0; i < piResolution * 2; i++) {
        let iBase = rounds * piResolution * 2;
        let iBaseNext = (rounds + 1) * piResolution * 2;
        faces.push([
          vertexClass[iBase + i],
          vertexClass[iBase + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + (i % (piResolution * 2))],
        ]);
        cell.push(facesIndex);
        facesIndex++;
      }
    }
    cells.push(cell);
  }

  for (let key in classOfVertex.gamma) {
    if (parseInt(key) < piResolution) {
      //we need to reconstruct the rounds from the classvertex
      const vertexClassOne = classOfVertex.gamma[key];
      const vertexClassTwo = classOfVertex.gamma[parseInt(key) + piResolution];

      const vertexClass = [];

      for (
        let rounds = 0;
        rounds < vertexClassOne.length / (piResolution + 1);
        rounds++
      ) {
        vertexClass.push(
          ...vertexClassOne.slice(
            rounds * (piResolution + 1),
            (rounds + 1) * (piResolution + 1)
          )
        );
        vertexClass.push(
          ...vertexClassTwo
            .slice(
              rounds * (piResolution + 1),
              (rounds + 1) * (piResolution + 1)
            )
            .reverse()
        );
      }

      const cell = [];
      for (
        let rounds = 0;
        rounds < vertexClass.length / (2 * (piResolution + 1)) - 1;
        rounds++
      ) {
        for (let i = 0; i < 2 * (piResolution + 1); i++) {
          let iBase = rounds * (2 * (piResolution + 1));
          let iBaseNext = (rounds + 1) * (2 * (piResolution + 1));
          faces.push([
            vertexClass[iBase + i],
            vertexClass[iBase + ((i + 1) % (2 * (piResolution + 1)))],
            vertexClass[iBaseNext + ((i + 1) % (2 * (piResolution + 1)))],
            vertexClass[iBaseNext + (i % (2 * (piResolution + 1)))],
          ]);
          cell.push(facesIndex);
          facesIndex++;
        }
      }
      cells.push(cell);
    }
  }

  return {
    vertices,
    faces,
    cells,
  }
}

var threesphere = createSphere(1);

function createTorus(r1, r2, r3, piResolution = 8) {
  const vertices = [];
  const faces = [];
  const cells = [];
  let facesIndex = 0;

  const classOfVertex = {
    theta: {},
    phi: {},
    gamma: {},
  };

  for (let theta = 0; theta <= piResolution; theta++) {
    for (let phi = 0; phi <= piResolution; phi++) {
      for (let gamma = 0; gamma < 2 * piResolution; gamma++) {
        //for (let gamma = 0; gamma < 2 * piResolution; gamma+=piResolution) {
        if (!classOfVertex.theta[theta]) {
          classOfVertex.theta[theta] = [];
        }
        if (!classOfVertex.phi[phi]) {
          classOfVertex.phi[phi] = [];
        }
        if (!classOfVertex.gamma[gamma]) {
          classOfVertex.gamma[gamma] = [];
        }

        classOfVertex.theta[theta].push(vertices.length);
        classOfVertex.phi[phi].push(vertices.length);
        classOfVertex.gamma[gamma].push(vertices.length);

        const thetaInPi = (theta * Math.PI) / piResolution;
        const phiInPi = (phi * Math.PI) / piResolution;
        const gammaInPi = (gamma * Math.PI) / piResolution;

        vertices.push([
          r1 * Math.cos(thetaInPi),
          (r2 + r1 * Math.sin(thetaInPi)) * Math.cos(phiInPi),
          (r3 + (r2 + r1 *
            Math.sin(thetaInPi)) *
            Math.sin(phiInPi)) *
            Math.cos(gammaInPi),
          (r3 + (r2 + r1 *
            Math.sin(thetaInPi)) *
            Math.sin(phiInPi)) *
            Math.sin(gammaInPi),
        ]);
      }
    }
  }

  for (let key in classOfVertex.theta) {
    const vertexClass = classOfVertex.theta[key];
    const cell = [];
    for (
      let rounds = 0;
      rounds < vertexClass.length / (piResolution * 2) - 1;
      rounds++
    ) {
      for (let i = 0; i < piResolution * 2; i++) {
        let iBase = rounds * piResolution * 2;
        let iBaseNext = (rounds + 1) * piResolution * 2;
        faces.push([
          vertexClass[iBase + i],
          vertexClass[iBase + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + (i % (piResolution * 2))],
        ]);
        cell.push(facesIndex);
        facesIndex++;
      }
    }
    cells.push(cell);
  }

  for (let key in classOfVertex.phi) {
    const vertexClass = classOfVertex.phi[key];
    const cell = [];
    for (
      let rounds = 0;
      rounds < vertexClass.length / (piResolution * 2) - 1;
      rounds++
    ) {
      for (let i = 0; i < piResolution * 2; i++) {
        let iBase = rounds * piResolution * 2;
        let iBaseNext = (rounds + 1) * piResolution * 2;
        faces.push([
          vertexClass[iBase + i],
          vertexClass[iBase + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + ((i + 1) % (piResolution * 2))],
          vertexClass[iBaseNext + (i % (piResolution * 2))],
        ]);
        cell.push(facesIndex);
        facesIndex++;
      }
    }
    cells.push(cell);
  }

  for (let key in classOfVertex.gamma) {
    if (parseInt(key) < piResolution) {
      //we need to reconstruct the rounds from the classvertex
      const vertexClassOne = classOfVertex.gamma[key];
      const vertexClassTwo = classOfVertex.gamma[parseInt(key) + piResolution];

      const vertexClass = [];

      for (
        let rounds = 0;
        rounds < vertexClassOne.length / (piResolution + 1);
        rounds++
      ) {
        vertexClass.push(
          ...vertexClassOne.slice(
            rounds * (piResolution + 1),
            (rounds + 1) * (piResolution + 1)
          )
        );
        vertexClass.push(
          ...vertexClassTwo
            .slice(
              rounds * (piResolution + 1),
              (rounds + 1) * (piResolution + 1)
            )
            .reverse()
        );
      }

      const cell = [];
      for (
        let rounds = 0;
        rounds < vertexClass.length / (2 * (piResolution + 1)) - 1;
        rounds++
      ) {
        for (let i = 0; i < 2 * (piResolution + 1); i++) {
          let iBase = rounds * (2 * (piResolution + 1));
          let iBaseNext = (rounds + 1) * (2 * (piResolution + 1));
          faces.push([
            vertexClass[iBase + i],
            vertexClass[iBase + ((i + 1) % (2 * (piResolution + 1)))],
            vertexClass[iBaseNext + ((i + 1) % (2 * (piResolution + 1)))],
            vertexClass[iBaseNext + (i % (2 * (piResolution + 1)))],
          ]);
          cell.push(facesIndex);
          facesIndex++;
        }
      }
      cells.push(cell);
    }
  }

  return {
    vertices,
    faces,
    cells,
  }
}

var threetorus = createTorus(0.1, 0.5, 1);

function createFlatTorus(r1, r2, piResolution = 32) {
  const vertices = [];
  const faces = [];
  const cells = [];
  let facesIndex = 0;

  for (let theta = 0; theta < 2 * piResolution; theta++) {
    for (let phi = 0; phi < 2 * piResolution; phi++) {
      const thetaInPi = (theta * Math.PI) / piResolution;
      const phiInPi = (phi * Math.PI) / piResolution;

      vertices.push([
        r1 * Math.cos(thetaInPi),
        r1 * Math.sin(thetaInPi),
        r2 * Math.cos(phiInPi),
        r2 * Math.sin(phiInPi),
      ]);
    }
  }

  const cell = [];
  for (let i = 0; i < vertices.length; i++) {
    let iBaseNext = i + piResolution * 2;
    faces.push([
      i,
      (i + 1) % vertices.length,
      (iBaseNext + 1) % vertices.length,
      iBaseNext % vertices.length,
    ]);
    cell.push(facesIndex);
    facesIndex++;
  }
  cells.push(cell);

  return {
    vertices,
    faces,
    cells,
  }
}

var flattorus = createFlatTorus(1, 0.5);

var index = /*#__PURE__*/Object.freeze({
  __proto__: null,
  tesseract: tesseract,
  pentachoron: pentachoron,
  hexadecachoron: hexadecachoron,
  threesphere: threesphere,
  threetorus: threetorus,
  flattorus: flattorus
});

export { HyperEdgeGeometry, HyperGeometry, HyperMesh, HyperPointsGeometry, HyperRenderer, index as shapes };
