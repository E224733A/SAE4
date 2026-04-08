const test = require('node:test');
const assert = require('node:assert/strict');
const { haversineDistanceKm, rankPoisBetweenPoints } = require('../utils/distance');

test('haversineDistanceKm renvoie 0 pour deux points identiques', () => {
  const distance = haversineDistanceKm(
    { lat: 47.2184, lon: -1.5536 },
    { lat: 47.2184, lon: -1.5536 }
  );

  assert.equal(distance, 0);
});

test('rankPoisBetweenPoints classe les POI du plus proche au moins proche', () => {
  const ranked = rankPoisBetweenPoints(
    { lat: 47.2, lon: -1.5 },
    { lat: 47.3, lon: -1.6 },
    [
      { type: 'toilettes', lat: 47.21, lon: -1.51, sourceId: 'a' },
      { type: 'toilettes', lat: 48.0, lon: -2.0, sourceId: 'b' }
    ]
  );

  assert.equal(ranked[0].sourceId, 'a');
});

test('haversineDistanceKm calcule correctement une distance connue', () => {
  // Paris et Nantes (environ 340-350 km à vol d'oiseau)
  const paris = { lat: 48.8566, lon: 2.3522 };
  const nantes = { lat: 47.2184, lon: -1.5536 };
  const distance = haversineDistanceKm(paris, nantes);
  
  // On vérifie que la distance est cohérente (entre 340 et 350 km)
  assert.ok(distance > 340 && distance < 350);
});

test('rankPoisBetweenPoints gère un tableau de POI vide', () => {
  const ranked = rankPoisBetweenPoints(
    { lat: 47.2, lon: -1.5 },
    { lat: 47.3, lon: -1.6 },
    []
  );
  assert.deepEqual(ranked, []);
});

test('rankPoisBetweenPoints ajoute bien les propriétés de distance aux objets', () => {
  const ranked = rankPoisBetweenPoints(
    { lat: 47.2, lon: -1.5 },
    { lat: 47.3, lon: -1.6 },
    [{ type: 'toilettes', lat: 47.25, lon: -1.55, sourceId: 'a' }]
  );
  
  // Vérifie que les clés existent et sont des nombres
  assert.equal(typeof ranked[0].scoreKm, 'number');
  assert.equal(typeof ranked[0].distanceFromStartKm, 'number');
  assert.equal(typeof ranked[0].distanceToEndKm, 'number');
});
