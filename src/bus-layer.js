import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';

const origin = maplibregl.MercatorCoordinate.fromLngLat([23.82, 38.09]);
const metres = origin.meterInMercatorCoordinateUnits();
const materials = {
  white: new THREE.MeshLambertMaterial({ color: '#f4f5ef' }),
  blue: new THREE.MeshLambertMaterial({ color: '#176b9d' }),
  yellow: new THREE.MeshLambertMaterial({ color: '#e6bd4d' }),
  glass: new THREE.MeshLambertMaterial({ color: '#294653' }),
  roof: new THREE.MeshLambertMaterial({ color: '#c8d5d4' }),
  wheel: new THREE.MeshLambertMaterial({ color: '#26343a' }),
};

function busModel() {
  const bus = new THREE.Group();
  const box = (width, length, height, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, height), material);
    mesh.position.set(x, y, z);
    bus.add(mesh);
  };
  // The front faces north (-Y). White body, blue lower panels and yellow trim
  // follow the current OASA fleet; each vehicle model stays schematic.
  box(2.5, 11.6, 2.65, 0, 0, 1.48, materials.white);
  box(2.52, 11.25, 0.44, 0, 0, 0.55, materials.blue);
  box(2.3, 1.15, 1.15, 0, -5.85, 2.02, materials.glass);
  box(1.25, 0.08, 0.25, 0, -6.48, 2.68, materials.yellow);
  box(2.4, 0.08, 0.85, 0, 5.84, 2.05, materials.glass);
  for (const side of [-1, 1]) {
    box(0.06, 8.4, 0.82, side * 1.28, 0, 2.25, materials.glass);
    box(0.08, 9.9, 0.16, side * 1.3, 0, 1.15, materials.yellow);
    for (const axle of [-3.8, 3.8]) box(0.32, 0.9, 0.9, side * 1.36, axle, 0.52, materials.wheel);
  }
  box(1.25, 2.4, 0.22, 0, 1.3, 2.92, materials.roof);
  box(1.1, 1.4, 0.19, 0, -2.1, 2.9, materials.roof);
  return bus;
}

export function createBusLayer(map) {
  return {
    id: 'bus-models', type: 'custom', renderingMode: '3d', visible: false, vehicles: [],
    onAdd(_, gl) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      this.renderer.autoClear = false;
      this.scene.add(new THREE.AmbientLight(0xffffff, 1.5));
      const sun = new THREE.DirectionalLight(0xffffff, 1.8);
      sun.position.set(-200, -300, 500);
      this.scene.add(sun);
      this.template = busModel();
      this.models = [];
    },
    setVehicles(vehicles) {
      this.vehicles = vehicles;
      if (!this.scene) return;
      for (const model of this.models) this.scene.remove(model);
      this.models = vehicles.filter(({ properties }) => Number.isFinite(properties.heading)).map(({ geometry, properties }) => {
        const point = maplibregl.MercatorCoordinate.fromLngLat(geometry.coordinates);
        const model = this.template.clone(true);
        model.position.set((point.x - origin.x) / metres, (point.y - origin.y) / metres, 0);
        model.rotation.z = properties.heading * Math.PI / 180;
        this.scene.add(model);
        return model;
      });
      map.triggerRepaint();
    },
    render(gl, args) {
      if (!this.visible || !this.models.length) return;
      // Symbolic size stays legible at city zoom; its geographic anchor is the feed position.
      const size = Math.min(8, Math.max(1, 1.5 * 2 ** (18 - map.getZoom())));
      for (const model of this.models) model.scale.setScalar(size);
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
