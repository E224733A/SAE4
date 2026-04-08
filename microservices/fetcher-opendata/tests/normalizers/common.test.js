'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  getByPath,
  pickFirst,
  asString,
  asNumber,
  compactObject,
  normalizePoi,
  extractRecords
} = require('../../services/normalizers/common');

// ─── getByPath ────────────────────────────────────────────────────────────────
describe('getByPath', () => {
  test('accède à une propriété de premier niveau', () => {
    assert.equal(getByPath({ a: 1 }, 'a'), 1);
  });

  test('accède à une propriété imbriquée avec notation pointée', () => {
    assert.equal(getByPath({ a: { b: { c: 42 } } }, 'a.b.c'), 42);
  });

  test('renvoie null si le chemin est inexistant', () => {
    assert.equal(getByPath({ a: 1 }, 'a.b.c'), null);
  });

  test('renvoie null si l\'objet est null', () => {
    assert.equal(getByPath(null, 'a'), null);
  });

  test('renvoie null si le chemin est null', () => {
    assert.equal(getByPath({ a: 1 }, null), null);
  });

  test('renvoie null si un nœud intermédiaire est null', () => {
    assert.equal(getByPath({ a: null }, 'a.b'), null);
  });

  test('renvoie 0 (falsy valide) sans le confondre avec null', () => {
    assert.equal(getByPath({ a: { b: 0 } }, 'a.b'), 0);
  });
});

// ─── asString ─────────────────────────────────────────────────────────────────
describe('asString', () => {
  test('convertit un nombre en chaîne', () => {
    assert.equal(asString(42), '42');
  });

  test('retourne null pour null', () => {
    assert.equal(asString(null), null);
  });

  test('retourne null pour undefined', () => {
    assert.equal(asString(undefined), null);
  });

  test('retourne null pour une chaîne vide ou espaces', () => {
    assert.equal(asString('   '), null);
  });

  test('trim les espaces en début et fin', () => {
    assert.equal(asString('  bonjour  '), 'bonjour');
  });
});

// ─── asNumber ─────────────────────────────────────────────────────────────────
describe('asNumber', () => {
  test('renvoie le nombre tel quel', () => {
    assert.equal(asNumber(3.14), 3.14);
  });

  test('convertit une chaîne numérique', () => {
    assert.equal(asNumber('42'), 42);
  });

  test('gère la virgule décimale (format FR)', () => {
    assert.equal(asNumber('3,14'), 3.14);
  });

  test('renvoie null pour null', () => {
    assert.equal(asNumber(null), null);
  });

  test('renvoie null pour une chaîne vide', () => {
    assert.equal(asNumber(''), null);
  });

  test('renvoie null pour NaN', () => {
    assert.equal(asNumber('abc'), null);
  });

  test('renvoie null pour Infinity', () => {
    assert.equal(asNumber(Infinity), null);
  });

  test('renvoie 0 pour la valeur zéro', () => {
    assert.equal(asNumber(0), 0);
  });
});

// ─── pickFirst ────────────────────────────────────────────────────────────────
describe('pickFirst', () => {
  const record = { a: null, b: '', c: 'trouvé', d: 'second' };

  test('renvoie la première valeur non nulle et non vide', () => {
    assert.equal(pickFirst(record, ['a', 'b', 'c', 'd']), 'trouvé');
  });

  test('renvoie null si aucun sélecteur ne correspond', () => {
    assert.equal(pickFirst(record, ['a', 'b']), null);
  });

  test('accepte une fonction comme sélecteur', () => {
    const result = pickFirst({ x: 10 }, [(r) => r.x * 2]);
    assert.equal(result, 20);
  });

  test('ignore une fonction qui retourne null', () => {
    const result = pickFirst({ x: null }, [(r) => r.x, 'fallback']);
    assert.equal(result, null);
  });
});

// ─── compactObject ────────────────────────────────────────────────────────────
describe('compactObject', () => {
  test('supprime les valeurs null et undefined', () => {
    const result = compactObject({ a: 1, b: null, c: undefined });
    assert.deepEqual(result, { a: 1 });
  });

  test('supprime les chaînes vides', () => {
    const result = compactObject({ a: 'ok', b: '' });
    assert.deepEqual(result, { a: 'ok' });
  });

  test('supprime les objets vides', () => {
    const result = compactObject({ a: 1, b: {} });
    assert.deepEqual(result, { a: 1 });
  });

  test('conserve les tableaux vides (comportement attendu)', () => {
    // Les tableaux vides ne sont PAS des objets vides au sens de la fonction
    const result = compactObject({ a: [] });
    assert.deepEqual(result, { a: [] });
  });

  test('conserve la valeur 0', () => {
    const result = compactObject({ a: 0 });
    assert.deepEqual(result, { a: 0 });
  });
});

// ─── extractRecords ───────────────────────────────────────────────────────────
describe('extractRecords', () => {
  test('extrait depuis payload.results', () => {
    const payload = { results: [{ id: 1 }, { id: 2 }] };
    assert.deepEqual(extractRecords(payload), [{ id: 1 }, { id: 2 }]);
  });

  test('extrait depuis payload.records', () => {
    const payload = { records: [{ id: 1 }] };
    assert.deepEqual(extractRecords(payload), [{ id: 1 }]);
  });

  test('extrait depuis payload.data', () => {
    const payload = { data: [{ id: 1 }] };
    assert.deepEqual(extractRecords(payload), [{ id: 1 }]);
  });

  test('extrait depuis payload.features (GeoJSON)', () => {
    const payload = { features: [{ id: 1 }] };
    assert.deepEqual(extractRecords(payload), [{ id: 1 }]);
  });

  test('renvoie le tableau directement si payload est un tableau', () => {
    const payload = [{ id: 1 }];
    assert.deepEqual(extractRecords(payload), [{ id: 1 }]);
  });

  test('renvoie un tableau vide si aucun format reconnu', () => {
    assert.deepEqual(extractRecords({ unknown: true }), []);
  });

  test('renvoie un tableau vide pour null', () => {
    assert.deepEqual(extractRecords(null), []);
  });
});

// ─── normalizePoi ─────────────────────────────────────────────────────────────
describe('normalizePoi', () => {
  const baseConfig = {
    type: 'toilettes',
    datasetKey: 'toilettes',
    idSelectors: ['idobj'],
    nameSelectors: ['nom'],
    addressSelectors: ['adresse'],
    citySelectors: ['commune'],
    postcodeSelectors: ['code_postal'],
    accessibilitySelectors: ['acces_pmr'],
    openingHoursSelectors: ['horaires'],
    latSelectors: ['lat'],
    lonSelectors: ['lon'],
  };

  test('retourne null si pas de coordonnées', () => {
    const record = { idobj: '1', nom: 'Test', adresse: '1 rue X' };
    assert.equal(normalizePoi(record, baseConfig), null);
  });

  test('normalise un enregistrement complet', () => {
    const record = {
      idobj: '42',
      nom: 'Toilettes Royale',
      adresse: 'Place Royale',
      commune: 'Nantes',
      code_postal: '44000',
      acces_pmr: 'Oui',
      horaires: '24h/24',
      lat: 47.213,
      lon: -1.556,
    };
    const poi = normalizePoi(record, baseConfig);
    assert.equal(poi.type, 'toilettes');
    assert.equal(poi.sourceId, '42');
    assert.equal(poi.name, 'Toilettes Royale');
    assert.equal(poi.lat, 47.213);
    assert.equal(poi.lon, -1.556);
    assert.equal(poi.city, 'Nantes');
  });

  test('génère un sourceId synthétique si idSelectors ne trouvent rien', () => {
    const record = { lat: 47.0, lon: -1.5 };
    const poi = normalizePoi(record, { ...baseConfig, idSelectors: [] });
    assert.ok(poi.sourceId.includes('47'));
  });

  test('génère un name synthétique si nameSelectors ne trouvent rien', () => {
    const record = { idobj: 'xyz', lat: 47.0, lon: -1.5 };
    const poi = normalizePoi(record, { ...baseConfig, nameSelectors: [] });
    assert.ok(poi.name.includes('xyz') || poi.name.includes('toilettes'));
  });

  test('appelle la fonction extra si définie', () => {
    const record = { lat: 47.0, lon: -1.5, quartier: 'Centre' };
    const config = {
      ...baseConfig,
      extra: (r) => ({ quartier: r.quartier })
    };
    const poi = normalizePoi(record, config);
    assert.equal(poi.extra?.quartier, 'Centre');
  });
});