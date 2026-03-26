const { normalizeToilettes } = require('./toilettes.normalizer');
const { normalizeParkings } = require('./parkings.normalizer');
const { normalizeComposteurs } = require('./composteurs.normalizer');

const datasetNormalizers = {
  toilettes: normalizeToilettes,
  parkings: normalizeParkings,
  composteurs: normalizeComposteurs
};

module.exports = {
  datasetNormalizers
};
