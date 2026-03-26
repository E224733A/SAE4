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
