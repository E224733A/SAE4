function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

function hasValidCoordinates(point) {
  return Boolean(
    point &&
      isNumber(point.lat) &&
      isNumber(point.lon) &&
      point.lat >= -90 &&
      point.lat <= 90 &&
      point.lon >= -180 &&
      point.lon <= 180
  );
}

function validatePlanRequest(body) {
  const errors = [];

  if (!hasValidCoordinates(body?.start)) {
    errors.push('start doit contenir des coordonnées valides { lat, lon }.');
  }

  if (!hasValidCoordinates(body?.end)) {
    errors.push('end doit contenir des coordonnées valides { lat, lon }.');
  }

  if (body?.poiTypes !== undefined && !Array.isArray(body.poiTypes)) {
    errors.push('poiTypes doit être un tableau de chaînes si fourni.');
  }

  if (Array.isArray(body?.poiTypes) && !body.poiTypes.every((item) => typeof item === 'string')) {
    errors.push('Chaque entrée de poiTypes doit être une chaîne.');
  }

  if (body?.maxPoi !== undefined && (!Number.isInteger(body.maxPoi) || body.maxPoi < 0)) {
    errors.push('maxPoi doit être un entier positif ou nul.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validatePlanRequest
};
