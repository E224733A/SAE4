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

test('validatePlanRequest accepte une requête valide sans les paramètres optionnels', () => {
  const result = validatePlanRequest({
    start: { lat: 47.2, lon: -1.5 },
    end: { lat: 47.3, lon: -1.6 }
  });
  assert.equal(result.valid, true);
});

test('validatePlanRequest rejette si start ou end sont manquants', () => {
  const result = validatePlanRequest({
    // start est manquant
    end: { lat: 47.3, lon: -1.6 }
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /start doit contenir/);
});

test('validatePlanRequest accepte les valeurs limites exactes (lat: 90, lon: 180)', () => {
  const result = validatePlanRequest({
    start: { lat: 90, lon: 180 },
    end: { lat: -90, lon: -180 }
  });
  assert.equal(result.valid, true);
});

test('validatePlanRequest rejette un maxPoi négatif ou décimal', () => {
  const result1 = validatePlanRequest({
    start: { lat: 47.2, lon: -1.5 }, end: { lat: 47.3, lon: -1.6 },
    maxPoi: -5 // Invalide
  });
  assert.equal(result1.valid, false);

  const result2 = validatePlanRequest({
    start: { lat: 47.2, lon: -1.5 }, end: { lat: 47.3, lon: -1.6 },
    maxPoi: 3.5 // Invalide (doit être entier)
  });
  assert.equal(result2.valid, false);
});

test('validatePlanRequest rejette un poiTypes mal formaté', () => {
  const result = validatePlanRequest({
    start: { lat: 47.2, lon: -1.5 }, end: { lat: 47.3, lon: -1.6 },
    poiTypes: [123, true] // Invalide: ne sont pas des chaînes de caractères
  });
  assert.equal(result.valid, false);
});
