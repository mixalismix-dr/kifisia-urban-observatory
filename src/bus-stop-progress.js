export function busStopProgress(variant, runData, vehicleId, nextStopId, now = Date.now() / 1000) {
  const runStops = runData?.run?.stops;
  const source = runData?.sources?.find((item) => item.id === 'oasa');
  const matched = source?.state === 'ok' && now - source.updated_at < 300
    && runData?.run?.vehicle === `oasa:${vehicleId}`
    && runStops?.length === variant.stops.length
    && runStops.every((stop, index) => stop.stop === `oasa:${variant.stops[index]}`);
  return {
    matched,
    nextIndex: matched ? runStops.findIndex((stop) => !stop.passed) : variant.stops.indexOf(nextStopId),
    minutes: variant.stops.map((_, index) => matched && !runStops[index].passed
      && Number.isFinite(runStops[index].at) && runStops[index].source === 'live'
      ? Math.max(0, Math.ceil((runStops[index].at - now) / 60)) : null),
  };
}
