const imageryLabel = /^(highway-name-|label_(?:village|town|city(?:_capital)?|state|country_[123])$)/;
const properties = ['text-color', 'text-halo-color', 'text-halo-width'];

export function createBasemapLabelStyler(map) {
  const original = map.getStyle().layers
    .filter((layer) => layer.type === 'symbol' && imageryLabel.test(layer.id))
    .map((layer) => [layer.id, properties.map((property) => layer.paint?.[property] ?? null)]);
  return (satellite) => {
    for (const [id, paint] of original) {
      for (let index = 0; index < properties.length; index++) {
        map.setPaintProperty(id, properties[index], satellite
          ? ['#ffffff', 'rgba(0,0,0,0.75)', 1.2][index]
          : paint[index]);
      }
    }
  };
}
