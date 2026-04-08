'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeComposteurs } = require('../../services/normalizers/composteurs.normalizer');

const recordComplet = {
  idobj: 'C001',
  nom: 'Composteur Quartier Madeleine',
  adresse: '12 rue de la Madeleine',
  commune: 'Nantes',
  quartier: 'Madeleine-Champs-de-Mars',
  typologie: 'Composteur partagé',
  referent: 'Association verte',
  geo_point_2d: { lat: 47.207, lon: -1.544 }
};

describe('normalizeComposteurs', () => {
  test('retourne un POI valide pour un enregistrement complet', () => {
    const poi = normalizeComposteurs(recordComplet);
    assert.ok(poi !== null);
    assert.equal(poi.type, 'composteurs');
    assert.equal(poi.sourceDataset, 'composteurs');
    assert.equal(poi.sourceId, 'C001');
    assert.equal(poi.name, 'Composteur Quartier Madeleine');
    assert.equal(poi.lat, 47.207);
    assert.equal(poi.lon, -1.544);
  });

  test('retourne null si pas de coordonnées', () => {
    const record = { idobj: 'C002', nom: 'Composteur sans coords' };
    assert.equal(normalizeComposteurs(record), null);
  });

  test('peuple le champ extra correctement', () => {
    const poi = normalizeComposteurs(recordComplet);
    assert.equal(poi.extra?.typologie, 'Composteur partagé');
    assert.equal(poi.extra?.quartier, 'Madeleine-Champs-de-Mars');
    assert.equal(poi.extra?.commune, 'Nantes');
    assert.equal(poi.extra?.referent, 'Association verte');
  });

  test('utilise l\'adresse comme nom si nom absent', () => {
    const record = {
      adresse: '5 boulevard X',
      geo_point_2d: { lat: 47.2, lon: -1.5 }
    };
    const poi = normalizeComposteurs(record);
    assert.ok(poi !== null);
    assert.ok(poi.name.length > 0);
  });
});