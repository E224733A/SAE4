const { normalizePoi } = require('./common');

function normalizeParkings(record) {
  return normalizePoi(record, {
    datasetKey: 'parkings',
    type: 'parkings',
    idSelectors: [
      'grp_identifiant',
      'identifiant',
      'idobj',
      'id',
      'recordid'
    ],
    nameSelectors: [
      'grp_nom',
      'nom_complet',
      'nom',
      'libelle',
      'name',
      'titre',
      'adresse'
    ],
    addressSelectors: [
      'adresse',
      'adresse_postale',
      'quartier',
      'commune',
      'ville'
    ],
    citySelectors: ['commune', 'ville'],
    postcodeSelectors: ['code_postal', 'cp'],
    accessibilitySelectors: ['acces_pmr', 'accessibilite', 'pmr'],
    openingHoursSelectors: ['horaires', 'horaire'],
    latSelectors: ['lat', 'latitude'],
    lonSelectors: ['lon', 'longitude'],
    geoPointObjectSelectors: ['location', 'geo_point_2d', 'position'],
    geoPointArraySelectors: ['geo_point_2d', 'location'],
    geometrySelectors: [
      'geometry.coordinates',
      'geo_shape.coordinates',
      'geo_shape.geometry.coordinates'
    ],
    extra(record, helpers) {
      return {
        category: helpers.asString(
          helpers.pickFirst(record, ['libcategorie', 'categorie'])
        ),
        parkingType: helpers.asString(
          helpers.pickFirst(record, ['libtype', 'type'])
        ),
        status: helpers.asString(
          helpers.pickFirst(record, ['grp_statut', 'statut', 'etat', 'status'])
        ),
        availablePlaces: helpers.asNumber(
          helpers.pickFirst(record, [
            'grp_disponible',
            'disponible',
            'places_disponibles',
            'places_libres',
            'available_places'
          ])
        ),
        totalPlaces: helpers.asNumber(
          helpers.pickFirst(record, [
            'capacite_voiture',
            'grp_exploitation',
            'capacite',
            'capacite_totale',
            'nb_places',
            'places_totales'
          ])
        ),
        commune: helpers.asString(
          helpers.pickFirst(record, ['commune'])
        ),
        siteWeb: helpers.asString(
          helpers.pickFirst(record, ['site_web'])
        )
      };
    }
  });
}

module.exports = {
  normalizeParkings
};