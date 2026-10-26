import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';

const materials = {
  body: new THREE.MeshLambertMaterial({ color: '#dde3df' }),
  green: new THREE.MeshLambertMaterial({ color: '#42836b' }),
  glass: new THREE.MeshLambertMaterial({ color: '#263e42' }),
  roof: new THREE.MeshLambertMaterial({ color: '#aebbb5' }),
  dark: new THREE.MeshLambertMaterial({ color: '#33464a' }),
  light: new THREE.MeshLambertMaterial({ color: '#f8edc5' }),
};

function trainModel() {
  const train = new THREE.Group();
  const box = (width, length, height, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, height), material);
    mesh.position.set(x, y, z);
    train.add(mesh);
  };
  // The front faces north (-Y). This is a schematic Line 1 carriage.
  box(2.8, 17, 2.7, 0, 0, 1.65, materials.body);
  box(2.82, 16.8, 0.52, 0, 0, 1.25, materials.green);
  box(2.5, 15.4, 0.18, 0, 0, 3.1, materials.roof);
  box(2.3, 0.1, 1.15, 0, -8.55, 2.1, materials.glass);
  box(2.3, 0.1, 1.15, 0, 8.55, 2.1, materials.glass);
  for (const side of [-1, 1]) {
    for (const offset of [-5.5, -3.7, -1.9, 1.9, 3.7, 5.5])
      box(0.07, 1.25, 0.8, side * 1.43, offset, 2.3, materials.glass);
    for (const offset of [-0.1, 7.2])
      box(0.08, 1.2, 1.6, side * 1.44, offset, 1.6, materials.roof);
    for (const offset of [-5.2, 5.2])
      box(0.35, 1, 0.55, side * 1.35, offset, 0.42, materials.dark);
  }
  for (const side of [-0.85, 0.85]) box(0.32, 0.12, 0.24, side, -8.62, 1.15, materials.light);
  box(1.2, 1.8, 0.2, 0, 1.5, 3.22, materials.roof);
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
