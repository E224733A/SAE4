'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeParkings } = require('../../services/normalizers/parkings.normalizer');

const recordFusionne = {
  grp_identifiant: 'P001',
  grp_nom: 'Parking Commerce',
  adresse: '2 place du Commerce',
  commune: 'Nantes',
  acces_pmr: 'Oui',
  grp_statut: 'Ouvert',
  grp_disponible: 45,
  capacite_voiture: 200,
  libcategorie: 'Parking souterrain',
  libtype: 'Payant',
  location: { lat: 47.2137, lon: -1.5594 }
};

describe('normalizeParkings', () => {
  test('normalise un enregistrement fusionné complet', () => {
    const poi = normalizeParkings(recordFusionne);
    assert.ok(poi !== null);
    assert.equal(poi.type, 'parkings');
    assert.equal(poi.sourceId, 'P001');
    assert.equal(poi.name, 'Parking Commerce');
    assert.equal(poi.extra?.availablePlaces, 45);
    assert.equal(poi.extra?.totalPlaces, 200);
    assert.equal(poi.extra?.status, 'Ouvert');
  });

  test('retourne null sans coordonnées', () => {
    const record = { grp_identifiant: 'P002', grp_nom: 'Test' };
    assert.equal(normalizeParkings(record), null);
  });

  test('utilise grp_nom en priorité sur nom pour le name', () => {
    const record = {
      grp_nom: 'Nom Principal',
      nom: 'Nom secondaire',
      location: { lat: 47.2, lon: -1.5 }
    };
    const poi = normalizeParkings(record);
    assert.equal(poi.name, 'Nom Principal');
  });

  test('extra contient category et parkingType', () => {
    const poi = normalizeParkings(recordFusionne);
    assert.equal(poi.extra?.category, 'Parking souterrain');
    assert.equal(poi.extra?.parkingType, 'Payant');
  });

  test('gère un enregistrement avec seulement les données de disponibilité (sans statique)', () => {
    const record = {
      grp_identifiant: 'P003',
      grp_nom: 'Parking Nord',
      grp_disponible: 10,
      geo_point_2d: { lat: 47.22, lon: -1.56 }
    };
    const poi = normalizeParkings(record);
    assert.ok(poi !== null);
    assert.equal(poi.extra?.availablePlaces, 10);
  });
});