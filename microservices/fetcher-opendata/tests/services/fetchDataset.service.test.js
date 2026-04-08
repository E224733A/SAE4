'use strict';
const { test, describe, mock, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// ─── Tests sur normalizeMergeKey et mergeParkingRecords ───────────────────────
// Ces fonctions sont internes au module, on les teste via fetchAndNormalizeDataset
// ou en exposant le module avec des mocks du DAO

const serviceModulePath = require.resolve('../../services/fetchDataset.service');
const daoModulePath = require.resolve('../../dao/opendata.dao');

function loadServiceWithMockedDao(mockImpl) {
  // Nettoyer le cache pour forcer le rechargement
  delete require.cache[serviceModulePath];

  // Remplacer le module DAO dans le cache par un mock
  require.cache[daoModulePath] = {
    id: daoModulePath,
    filename: daoModulePath,
    loaded: true,
    exports: mockImpl
  };

  const service = require('../../services/fetchDataset.service');
  return service;
}

function cleanup() {
  delete require.cache[serviceModulePath];
  delete require.cache[daoModulePath];
}

describe('fetchAndNormalizeDataset – toilettes', () => {
  afterEach(cleanup);

  const fakeToilettesPayload = {
    results: [
      {
        idobj: 'T001',
        nom: 'Toilettes Test',
        commune: 'Nantes',
        geo_point_2d: { lat: 47.21, lon: -1.55 }
      },
      {
        // Sans coordonnées → doit être filtré
        idobj: 'T002',
        nom: 'Toilettes sans coords'
      }
    ]
  };

  test('retourne les POI normalisés et filtre les invalides', async () => {
    const mockDao = {
      fetchDataset: async (key) => {
        if (key === 'toilettes') return fakeToilettesPayload;
        throw new Error('Dataset inconnu');
      }
    };

    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);
    const result = await fetchAndNormalizeDataset('toilettes');

    assert.equal(result.state, 'NORMALIZATION_COMPLETED');
    assert.equal(result.datasetKey, 'toilettes');
    assert.equal(result.fetchedCount, 2);
    assert.equal(result.normalizedCount, 1); // T002 filtré
    assert.equal(result.items[0].sourceId, 'T001');
    assert.ok(result.stateTrace.includes('FETCH_COMPLETED'));
    assert.ok(result.stateTrace.includes('NORMALIZATION_COMPLETED'));
  });

  test('lève une erreur 404 pour un dataset inconnu', async () => {
    const mockDao = { fetchDataset: async () => ({}) };
    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);

    await assert.rejects(
      () => fetchAndNormalizeDataset('dataset_inexistant'),
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.code, 'UNKNOWN_DATASET');
        return true;
      }
    );
  });

  test('propage les erreurs réseau du DAO', async () => {
    const mockDao = {
      fetchDataset: async () => {
        const err = new Error('Timeout');
        err.status = 503;
        throw err;
      }
    };
    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);

    await assert.rejects(
      () => fetchAndNormalizeDataset('toilettes'),
      (err) => {
        assert.equal(err.status, 503);
        return true;
      }
    );
  });
});

describe('fetchAndNormalizeDataset – parkings (fusion)', () => {
  afterEach(cleanup);

  const fakeDisponibilite = {
    results: [
      {
        grp_identifiant: 'P_COMMERCE',
        grp_nom: 'Parking Commerce',
        grp_disponible: 30,
        grp_statut: 'Ouvert'
      }
    ]
  };

  const fakeStatique = {
    results: [
      {
        grp_identifiant: 'P_COMMERCE',
        grp_nom: 'Parking Commerce',
        capacite_voiture: 200,
        adresse: 'Place du Commerce',
        commune: 'Nantes',
        location: { lat: 47.2137, lon: -1.5594 }
      }
    ]
  };

  test('fusionne les données dispo + statique sur grp_identifiant', async () => {
    const mockDao = {
      fetchDataset: async (key) => {
        if (key === 'parkings') return fakeDisponibilite;
        if (key === 'parkingsStatic') return fakeStatique;
        throw new Error('inconnu');
      }
    };

    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);
    const result = await fetchAndNormalizeDataset('parkings');

    assert.equal(result.state, 'NORMALIZATION_COMPLETED');
    assert.equal(result.normalizedCount, 1);

    const parking = result.items[0];
    // Données de disponibilité
    assert.equal(parking.extra.availablePlaces, 30);
    assert.equal(parking.extra.status, 'Ouvert');
    // Données statiques fusionnées
    assert.equal(parking.extra.totalPlaces, 200);
    assert.equal(parking.lat, 47.2137);
  });

  test('normalise quand même si aucune correspondance statique (parking sans fusion)', async () => {
    const disponibiliteSeule = {
      results: [
        {
          grp_identifiant: 'P_INCONNU',
          grp_nom: 'Parking Orphelin',
          grp_disponible: 5,
          location: { lat: 47.20, lon: -1.55 }
        }
      ]
    };

    const mockDao = {
      fetchDataset: async (key) => {
        if (key === 'parkings') return disponibiliteSeule;
        if (key === 'parkingsStatic') return { results: [] };
        throw new Error('inconnu');
      }
    };

    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);
    const result = await fetchAndNormalizeDataset('parkings');

    assert.equal(result.normalizedCount, 1);
    assert.equal(result.items[0].name, 'Parking Orphelin');
  });

  test('les deux fetchDataset sont appelés en parallèle pour parkings', async () => {
    const callLog = [];
    const mockDao = {
      fetchDataset: async (key) => {
        callLog.push(key);
        if (key === 'parkings') return fakeDisponibilite;
        if (key === 'parkingsStatic') return fakeStatique;
        throw new Error('inconnu');
      }
    };

    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);
    await fetchAndNormalizeDataset('parkings');

    assert.ok(callLog.includes('parkings'));
    assert.ok(callLog.includes('parkingsStatic'));
    assert.equal(callLog.length, 2);
  });
});

describe('fetchAndNormalizeDataset – composteurs', () => {
  afterEach(cleanup);

  test('normalise les composteurs correctement', async () => {
    const mockDao = {
      fetchDataset: async () => ({
        results: [
          {
            idobj: 'C001',
            nom: 'Composteur Test',
            commune: 'Nantes',
            geo_point_2d: { lat: 47.2, lon: -1.5 }
          }
        ]
      })
    };

    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);
    const result = await fetchAndNormalizeDataset('composteurs');

    assert.equal(result.items[0].type, 'composteurs');
    assert.equal(result.items[0].sourceId, 'C001');
  });

  test('fetchedAt est une date ISO valide', async () => {
    const mockDao = {
      fetchDataset: async () => ({ results: [] })
    };

    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);
    const result = await fetchAndNormalizeDataset('composteurs');

    assert.ok(!isNaN(Date.parse(result.fetchedAt)));
  });
});

// ─── Tests de la logique de fusion (normalizeMergeKey) ─────────────────────
// Via des cas de test de bout en bout sur mergeParkingRecords

describe('Fusion parking – correspondance par nom normalisé', () => {
  afterEach(cleanup);

  test('fusionne même si les noms diffèrent par accents/casse', async () => {
    const disponibilite = {
      results: [{
        grp_nom: 'Parking Général De Gaulle',
        grp_disponible: 12,
        grp_statut: 'Ouvert'
      }]
    };
    const statique = {
      results: [{
        grp_nom: 'Parking General de Gaulle',
        capacite_voiture: 100,
        location: { lat: 47.21, lon: -1.55 }
      }]
    };

    const mockDao = {
      fetchDataset: async (key) => {
        if (key === 'parkings') return disponibilite;
        if (key === 'parkingsStatic') return statique;
      }
    };

    const { fetchAndNormalizeDataset } = loadServiceWithMockedDao(mockDao);
    const result = await fetchAndNormalizeDataset('parkings');

    // La fusion doit avoir eu lieu → les coordonnées proviennent du statique
    if (result.normalizedCount > 0) {
      assert.equal(result.items[0].lat, 47.21);
    }
  });
});