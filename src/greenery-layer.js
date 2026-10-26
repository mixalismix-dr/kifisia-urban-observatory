import * as maplibregl from 'maplibre-gl';
import * as THREE from 'three';

const origin = maplibregl.MercatorCoordinate.fromLngLat([23.82, 38.09]);
const metres = origin.meterInMercatorCoordinateUnits();

export function createGreeneryLayer(map, features) {
  const positions = features.map(({ geometry, properties }) => {
    const [lon, lat] = geometry.coordinates;
    const point = maplibregl.MercatorCoordinate.fromLngLat([lon, lat]);
    return { lon, lat, x: (point.x - origin.x) / metres, y: (point.y - origin.y) / metres,
      height: properties.height_m, radius: properties.crown_radius_m, cover: properties.cover_pct };
  });

  return {
    id: 'greenery-3d', type: 'custom', renderingMode: '3d', visible: true,
    onAdd(_, gl) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.Camera();
      this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      this.renderer.autoClear = false;
      this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
      const sun = new THREE.DirectionalLight(0xffffff, 1.5);
      sun.position.set(-150, -250, 400);
      this.scene.add(sun);
      this.crownGeometry = new THREE.SphereGeometry(1, 8, 6);
      this.trunkGeometry = new THREE.CylinderGeometry(1, 1, 1, 5);
      this.crownMaterial = new THREE.MeshLambertMaterial({ color: '#ffffff' });
      this.trunkMaterial = new THREE.MeshLambertMaterial({ color: '#826d4f' });
      this.crowns = new THREE.InstancedMesh(this.crownGeometry, this.crownMaterial, positions.length);
      this.trunks = new THREE.InstancedMesh(this.trunkGeometry, this.trunkMaterial, positions.length);
      this.crowns.frustumCulled = false;
      this.trunks.frustumCulled = false;
      this.scene.add(this.trunks, this.crowns);
      this.updateVisible = () => {
        if (map.getZoom() < 14) {
          this.crowns.count = this.trunks.count = 0;
          return;
        }
        const bounds = map.getBounds();
        const longitudeMargin = (bounds.getEast() - bounds.getWest()) * 0.3;
        const latitudeMargin = (bounds.getNorth() - bounds.getSouth()) * 0.3;
        const left = bounds.getWest() - longitudeMargin, right = bounds.getEast() + longitudeMargin;
        const bottom = bounds.getSouth() - latitudeMargin, top = bounds.getNorth() + latitudeMargin;
        const object = new THREE.Object3D();
        const color = new THREE.Color();
        let count = 0;
        for (const tree of positions) {
          if (tree.lon < left || tree.lon > right || tree.lat < bottom || tree.lat > top) continue;
          object.position.set(tree.x, tree.y, tree.height * 0.65);
          object.scale.set(tree.radius, tree.radius, tree.height * 0.35);
          object.updateMatrix();
          this.crowns.setMatrixAt(count, object.matrix);
          color.set(tree.cover >= 65 ? '#4b7953' : tree.cover >= 40 ? '#639267' : '#82a47a');
          this.crowns.setColorAt(count, color);
          object.position.set(tree.x, tree.y, tree.height * 0.25);
          object.scale.set(Math.max(0.17, tree.height * 0.018), tree.height * 0.5, Math.max(0.17, tree.height * 0.018));
          object.rotation.set(Math.PI / 2, 0, 0);
          object.updateMatrix();
          this.trunks.setMatrixAt(count, object.matrix);
          object.rotation.set(0, 0, 0);
          count++;
        }
        this.crowns.count = this.trunks.count = count;
        this.crowns.instanceMatrix.needsUpdate = true;
        if (this.crowns.instanceColor) this.crowns.instanceColor.needsUpdate = true;
        this.trunks.instanceMatrix.needsUpdate = true;
        map.triggerRepaint();
      };
      map.on('moveend', this.updateVisible);
      this.updateVisible();
    },
    render(gl, args) {
      if (!this.visible || !this.crowns.count) return;
      const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const local = new THREE.Matrix4().makeTranslation(origin.x, origin.y, 0)
        .scale(new THREE.Vector3(metres, metres, metres));
      this.camera.projectionMatrix.copy(projection.multiply(local));
      this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
      this.renderer.resetState();
      this.renderer.render(this.scene, this.camera);
    },
    onRemove() {
      map.off('moveend', this.updateVisible);
      this.crownGeometry.dispose();
      this.trunkGeometry.dispose();
      this.crownMaterial.dispose();
      this.trunkMaterial.dispose();
      this.renderer.dispose();
    },
  };
}
