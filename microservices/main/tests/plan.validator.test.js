const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePlanRequest } = require('../validators/plan.validator');

test('validatePlanRequest accepte une requête valide', () => {
  const result = validatePlanRequest({
    start: { lat: 47.2, lon: -1.5 },
    end: { lat: 47.3, lon: -1.6 },
    poiTypes: ['toilettes'],
    maxPoi: 2
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validatePlanRequest rejette des coordonnées invalides', () => {
  const result = validatePlanRequest({
    start: { lat: 999, lon: -1.5 },
    end: { lat: 47.3, lon: -1.6 }
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 1);
});
