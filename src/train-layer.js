import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';

const materials = {
  body: new THREE.MeshLambertMaterial({ color: '#dde3df' }),
  green: new THREE.MeshLambertMaterial({ color: '#42836b' }),
  glass: new THREE.MeshLambertMaterial({ color: '#263e42' }),
  roof: new THREE.MeshLambertMaterial({ color: '#aebbb5' }),
  dark: new THREE.MeshLambertMaterial({ color: '#33464a' }),
  light: new THREE.MeshLambertMaterial({ color: '#f8edc5' }),
  tail: new THREE.MeshLambertMaterial({ color: '#a0444d' }),
};

function trainModel() {
  const train = new THREE.Group();
  const box = (width, length, height, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, height), material);
    mesh.position.set(x, y, z);
    train.add(mesh);
  };
  // Two connected carriages, bogies and rails distinguish this from the bus.
  // The cab faces north (-Y) before the model rotates to follow Line 1.
  for (const center of [-6.8, 6.8]) {
    box(2.9, 12.8, 2.6, 0, center, 1.7, materials.body);
    box(2.92, 12.6, 0.53, 0, center, 1.2, materials.green);
    box(2.7, 12.5, 0.16, 0, center, 3.08, materials.roof);
    box(1.2, 2.1, 0.2, 0, center, 3.2, materials.roof);
    for (const side of [-1, 1]) {
      for (const offset of [-4.3, -2.8, 2.8, 4.3])
        box(0.07, 1.15, 0.82, side * 1.49, center + offset, 2.27, materials.glass);
      for (const offset of [-0.7, 0.7])
        box(0.08, 1.05, 1.63, side * 1.5, center + offset, 1.85, materials.roof);
    }
  }
  box(2.2, 0.8, 2.2, 0, 0, 1.7, materials.dark);
  for (const end of [-13.25, 13.25]) {
    box(2.5, 0.14, 1.2, 0, end, 2.22, materials.glass);
    for (const side of [-0.9, 0.9])
      box(0.3, 0.16, 0.22, side, end, 1.18, end < 0 ? materials.light : materials.tail);
  }
  box(1.1, 0.16, 0.22, 0, -13.35, 2.94, materials.green);
  for (const side of [-0.87, 0.87]) box(0.12, 29, 0.14, side, 0, 0.13, materials.dark);
  for (const axle of [-10.3, -3.3, 3.3, 10.3]) {
    box(3, 1.25, 0.3, 0, axle, 0.45, materials.dark);
    for (const side of [-1.23, 1.23]) box(0.24, 0.8, 0.75, side, axle, 0.46, materials.dark);
  }
  return train;
}

export function createTrainLayer(map, coordinate, bearing) {
  const origin = maplibregl.MercatorCoordinate.fromLngLat(coordinate);
  const metres = origin.meterInMercatorCoordinateUnits();
  return {
    id: 'train-model', type: 'custom', renderingMode: '3d', visible: true,
    onAdd(_, gl) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      this.renderer.autoClear = false;
      this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const sun = new THREE.DirectionalLight(0xffffff, 1.8);
      sun.position.set(-200, -300, 500);
      this.scene.add(sun);
      this.model = trainModel();
      this.model.rotation.z = bearing * Math.PI / 180;
      this.scene.add(this.model);
    },
    render(gl, args) {
      if (!this.visible || map.getZoom() < 13) return;
      const size = Math.min(5, Math.max(1, 1.2 * 2 ** (17 - map.getZoom())));
      this.model.scale.setScalar(size);
      const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const local = new THREE.Matrix4().makeTranslation(origin.x, origin.y, 0)
        .scale(new THREE.Vector3(metres, metres, metres));
      this.camera.projectionMatrix.copy(projection.multiply(local));
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
    },
    onRemove() { this.renderer?.dispose(); },
  };
}
