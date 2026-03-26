function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(pointA, pointB) {
  const earthRadiusKm = 6371;
  const latDiff = toRadians(pointB.lat - pointA.lat);
  const lonDiff = toRadians(pointB.lon - pointA.lon);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadians(pointA.lat)) *
      Math.cos(toRadians(pointB.lat)) *
      Math.sin(lonDiff / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function rankPoisBetweenPoints(start, end, pois) {
  return pois
    .map((poi) => {
      const distanceFromStart = haversineDistanceKm(start, poi);
      const distanceToEnd = haversineDistanceKm(poi, end);

      return {
        ...poi,
        scoreKm: Number((distanceFromStart + distanceToEnd).toFixed(3)),
        distanceFromStartKm: Number(distanceFromStart.toFixed(3)),
        distanceToEndKm: Number(distanceToEnd.toFixed(3))
      };
    })
    .sort((a, b) => a.scoreKm - b.scoreKm);
}

module.exports = {
  haversineDistanceKm,
  rankPoisBetweenPoints
};
