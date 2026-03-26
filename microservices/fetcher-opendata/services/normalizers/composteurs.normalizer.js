const { normalizePoi } = require('./common');

function normalizeComposteurs(record) {
  return normalizePoi(record, {
    datasetKey: 'composteurs',
    type: 'composteurs',
    idSelectors: [
      'idobj',
      'identifiant',
      'id',
      'recordid',
      'gid'
    ],
    nameSelectors: [
      'nom',
      'nom_du_site',
      'site',
      'lieu',
      'libelle',
      'adresse'
    ],
    addressSelectors: [
      'adresse',
      'adresse_physique',
      'lieu',
      'quartier',
      'commune',
      'ville'
    ],
    citySelectors: ['commune', 'ville'],
    postcodeSelectors: ['code_postal', 'cp'],
    accessibilitySelectors: ['accessibilite', 'pmr'],
    openingHoursSelectors: ['horaires', 'horaire'],
    latSelectors: ['lat', 'latitude'],
    lonSelectors: ['lon', 'longitude'],
    geoPointObjectSelectors: ['geo_point_2d', 'location', 'position'],
    geoPointArraySelectors: ['geo_point_2d', 'location'],
    geometrySelectors: [
      'geometry.coordinates',
      'geo_shape.coordinates',
      'geo_shape.geometry.coordinates'
    ],
  
    extra(record, helpers) {
      return {
        typologie: helpers.asString(
          helpers.pickFirst(record, ['typologie', 'categorie', 'type', 'type_site'])
        ),
        lieu: helpers.asString(
          helpers.pickFirst(record, ['lieu', 'nom_du_site'])
        ),
        referent: helpers.asString(
          helpers.pickFirst(record, ['referent', 'contact'])
        ),
        commune: helpers.asString(
          helpers.pickFirst(record, ['commune'])
        ),
        quartier: helpers.asString(
          helpers.pickFirst(record, ['quartier'])
        )
      };
    }
  });
}

module.exports = {
  normalizeComposteurs
};