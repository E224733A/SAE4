const { normalizePoi } = require('./common');

function normalizeToilettes(record) {
  return normalizePoi(record, {
    datasetKey: 'toilettes',
    type: 'toilettes',
    idSelectors: ['idobj', 'identifiant', 'id', 'recordid'],
    nameSelectors: ['nom', 'libelle', 'adresse', 'commune'],
    addressSelectors: ['adresse', 'commune', 'quartier'],
    citySelectors: ['commune', 'ville'],
    postcodeSelectors: ['code_postal', 'cp'],
    accessibilitySelectors: ['acces_pmr', 'accessibilite', 'pmr', 'type_acces'],
    openingHoursSelectors: ['horaires', 'horaire'],
    latSelectors: ['lat', 'latitude'],
    lonSelectors: ['lon', 'longitude'],
    geoPointObjectSelectors: ['geo_point_2d'],
    geoPointArraySelectors: ['geo_point_2d', 'location'],
    geometrySelectors: ['geometry.coordinates', 'geo_shape.coordinates', 'geo_shape.geometry.coordinates'],
    extra(record, helpers) {
      return {
        commune: helpers.asString(helpers.pickFirst(record, ['commune'])),
        quartier: helpers.asString(helpers.pickFirst(record, ['quartier'])),
        equipement: helpers.asString(helpers.pickFirst(record, ['type_equipement', 'type'])),
        accesRestreint: helpers.asString(helpers.pickFirst(record, ['restriction_acces', 'restrictions_acces']))
      };
    }
  });
}

module.exports = {
  normalizeToilettes
};
