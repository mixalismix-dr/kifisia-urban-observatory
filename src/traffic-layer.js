import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';

const origin = maplibregl.MercatorCoordinate.fromLngLat([23.82, 38.09]);
const metre = origin.meterInMercatorCoordinateUnits();
const speeds = { motorway: 55, trunk: 48, primary: 38, secondary: 32, tertiary: 27, residential: 19, unclassified: 20, living_street: 12 };
const weights = { motorway: 4, trunk: 3, primary: 3, secondary: 2.4, tertiary: 1.8, residential: 1, unclassified: 1, living_street: 0.6 };
const dark = new THREE.MeshLambertMaterial({ color: '#24353a' });
const glass = new THREE.MeshLambertMaterial({ color: '#5c7780' });
const bodyColors = ['#ffffff', '#e84f3f', '#2798bf', '#f0c744'];

function carModel(color) {
  const car = new THREE.Group();
  const box = (width, length, height, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, height), material);
    mesh.position.set(x, y, z);
    car.add(mesh);
  };
  box(1.85, 4.4, 0.9, 0, 0, 0.8, new THREE.MeshLambertMaterial({ color }));
  box(1.55, 2.15, 0.85, 0, -0.1, 1.55, glass);
  for (const side of [-1, 1]) for (const axle of [-1.35, 1.35]) box(0.24, 0.62, 0.58, side * 0.93, axle, 0.45, dark);
  return car;
}

function roadPath(feature, index) {
  const points = feature.geometry.coordinates.map((coordinate) => {
    const point = maplibregl.MercatorCoordinate.fromLngLat(coordinate);
    return [(point.x - origin.x) / metre, (point.y - origin.y) / metre];
  });
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const lon = feature.geometry.coordinates.map((p) => p[0]), lat = feature.geometry.coordinates.map((p) => p[1]);
  return { points, distances, length: distances.at(-1), className: feature.properties.highway, index,
    bounds: [Math.min(...lon), Math.min(...lat), Math.max(...lon), Math.max(...lat)] };
}

function position(road, distance) {
  let i = 1;
  while (i < road.distances.length - 1 && road.distances[i] < distance) i++;
  const a = road.points[i - 1], b = road.points[i];
  const span = road.distances[i] - road.distances[i - 1];
  const t = span ? (distance - road.distances[i - 1]) / span : 0;
  return { x: a[0] + t * (b[0] - a[0]), y: a[1] + t * (b[1] - a[1]), bearing: Math.atan2(b[0] - a[0], -(b[1] - a[1])) };
}

export function createTrafficLayer(map) {
  return {
    id: 'estimated-traffic', type: 'custom', renderingMode: '3d', visible: false, roads: [], cars: [],
    onAdd(_, gl) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      this.renderer.autoClear = false;
      this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const light = new THREE.DirectionalLight(0xffffff, 1.6);
      light.position.set(-200, -300, 500);
      this.scene.add(light);
      this.templates = bodyColors.map(carModel);
      this.onMove = () => this.refresh();
      map.on('moveend', this.onMove);
      this.timer = setInterval(() => { if (this.visible && map.getZoom() >= 15) map.triggerRepaint(); }, 100);
    },
    setRoads(data) {
      this.roads = data.features.map(roadPath).filter((road) => road.length >= 75);
      this.refresh();
    },
    refresh() {
      if (!this.scene || !this.visible || !this.roads.length || map.getZoom() < 15) return;
      const view = map.getBounds();
      const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Athens', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
      const density = hour >= 23 || hour < 6 ? 0.38 : hour >= 7 && hour < 10 || hour >= 16 && hour < 19 ? 1.2 : 0.8;
      const limit = Math.round((map.getZoom() < 16 ? 110 : 85) * density);
      const candidates = this.roads.filter(({ bounds }) => bounds[0] <= view.getEast() && bounds[2] >= view.getWest() && bounds[1] <= view.getNorth() && bounds[3] >= view.getSouth());
      candidates.sort((a, b) => (Math.abs(Math.sin(a.index * 12.9898)) / (weights[a.className] || 1)) - (Math.abs(Math.sin(b.index * 12.9898)) / (weights[b.className] || 1)));
      for (const car of this.cars) this.scene.remove(car.model);
      this.cars = candidates.slice(0, limit).map((road, i) => {
        const model = this.templates[i % this.templates.length].clone(true);
        this.scene.add(model);
        return { road, model, offset: Math.abs(Math.sin(road.index * 78.233)) * road.length };
      });
      map.triggerRepaint();
    },
    render(gl, args) {
      if (!this.visible || map.getZoom() < 15 || !this.cars.length) return;
      const seconds = Date.now() / 1000;
      const size = Math.min(6, Math.max(1.5, 2.5 * 2 ** (17 - map.getZoom())));
      for (const { road, model, offset } of this.cars) {
        const speed = (speeds[road.className] || 20) / 3.6;
        const point = position(road, (offset + seconds * speed) % road.length);
        model.position.set(point.x, point.y, 0);
        model.rotation.z = point.bearing;
        model.scale.setScalar(size);
      }
      const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const local = new THREE.Matrix4().makeTranslation(origin.x, origin.y, 0).scale(new THREE.Vector3(metre, metre, metre));
      this.camera.projectionMatrix.copy(projection.multiply(local));
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
    },
    onRemove() { clearInterval(this.timer); map.off('moveend', this.onMove); this.renderer?.dispose(); },
  };
}
