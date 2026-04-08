'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeToilettes } = require('../../services/normalizers/toilettes.normalizer');

// Enregistrement réaliste extrait de l'API Nantes Métropole
const recordComplet = {
  idobj: 'T001',
  nom: 'Toilettes Place du Commerce',
  adresse: 'Place du Commerce',
  commune: 'Nantes',
  code_postal: '44000',
  quartier: 'Centre-ville',
  acces_pmr: 'Oui',
  horaires: '07h00-21h00',
  type_equipement: 'Sanitaire public',
  restriction_acces: 'Aucune',
  geo_point_2d: { lat: 47.2137, lon: -1.5594 }
};

describe('normalizeToilettes', () => {
  test('retourne un POI valide pour un enregistrement complet', () => {
    const poi = normalizeToilettes(recordComplet);
    assert.ok(poi !== null);
    assert.equal(poi.type, 'toilettes');
    assert.equal(poi.sourceDataset, 'toilettes');
    assert.equal(poi.sourceId, 'T001');
    assert.equal(poi.name, 'Toilettes Place du Commerce');
    assert.equal(poi.lat, 47.2137);
    assert.equal(poi.lon, -1.5594);
    assert.equal(poi.city, 'Nantes');
    assert.equal(poi.accessibility, 'Oui');
  });

  test('retourne null si pas de coordonnées géographiques', () => {
    const recordSansCoords = { idobj: 'T002', nom: 'Test', commune: 'Nantes' };
    assert.equal(normalizeToilettes(recordSansCoords), null);
  });

  test('extrait les coordonnées depuis geo_point_2d sous forme d\'objet', () => {
    const record = { geo_point_2d: { lat: 47.0, lon: -1.5 } };
    const poi = normalizeToilettes(record);
    assert.ok(poi !== null);
    assert.equal(poi.lat, 47.0);
    assert.equal(poi.lon, -1.5);
  });

  test('extrait les coordonnées depuis lat/lon directs', () => {
    const record = { idobj: 'T003', lat: 47.21, lon: -1.55 };
    const poi = normalizeToilettes(record);
    assert.ok(poi !== null);
    assert.equal(poi.lat, 47.21);
  });

  test('peuple le champ extra avec les données spécifiques', () => {
    const poi = normalizeToilettes(recordComplet);
    assert.ok(poi.extra !== undefined);
    assert.equal(poi.extra.commune, 'Nantes');
    assert.equal(poi.extra.quartier, 'Centre-ville');
    assert.equal(poi.extra.equipement, 'Sanitaire public');
  });

  test('tolère un enregistrement avec le minimum requis (coordonnées uniquement)', () => {
    const record = { lat: 47.0, lon: -1.5 };
    const poi = normalizeToilettes(record);
    assert.ok(poi !== null);
    assert.equal(poi.type, 'toilettes');
    assert.ok(typeof poi.sourceId === 'string');
    assert.ok(typeof poi.name === 'string');
  });

  test('fonctionne avec des coordonnées via geometry.coordinates (GeoJSON)', () => {
    const record = {
      idobj: 'T004',
      geometry: { coordinates: [-1.55, 47.21] }
    };
    const poi = normalizeToilettes(record);
    // Le format GeoJSON est [lon, lat]
    assert.ok(poi !== null);
  });

  test('ne laisse pas de champs null dans la sortie (compactObject)', () => {
    const record = { lat: 47.0, lon: -1.5 };
    const poi = normalizeToilettes(record);
    const nullFields = Object.entries(poi).filter(([, v]) => v === null);
    assert.equal(nullFields.length, 0);
  });
});