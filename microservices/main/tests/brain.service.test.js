const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');

const dataManagerDao = require('../dao/dataManager.dao');
const routingDao = require('../dao/routing.dao');
const distanceUtils = require('../utils/distance');

const serviceModulePath = require.resolve('../services/brain.service');

function loadFreshBrainService() {
  delete require.cache[serviceModulePath];
  return require('../services/brain.service');
}

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

test('brainService.getAvailableTypes retourne les types gérés', { concurrency: false }, () => {
  const brainService = loadFreshBrainService();

  assert.deepEqual(brainService.getAvailableTypes(), [
    'toilettes',
    'parkings',
    'composteurs'
  ]);
});

test('buildPlan filtre les types invalides, supprime les doublons, fusionne les POI et construit la réponse finale', { concurrency: false }, async () => {
  const previousDefaultMaxPoi = process.env.MAX_DEFAULT_POI;
  process.env.MAX_DEFAULT_POI = '3';

  const poiToilettes = {
    type: 'toilettes',
    sourceId: 'wc-1',
    lat: 47.218,
    lon: -1.553,
    name: 'WC 1'
  };

  const poiToilettesDuplique = {
    type: 'toilettes',
    sourceId: 'wc-1',
    lat: 47.218,
    lon: -1.553,
    name: 'WC 1 bis'
  };

  const poiComposteur = {
    type: 'composteurs',
    sourceId: 'comp-1',
    lat: 47.219,
    lon: -1.554,
    name: 'Composteur 1'
  };

  const getPoiCalls = [];
  const rankCalls = [];
  const routeCalls = [];

  const getPoiMock = mock.method(dataManagerDao, 'getPoiByType', async (type) => {
    getPoiCalls.push(type);

    if (type === 'toilettes') {
      return [poiToilettes, poiToilettesDuplique, null];
    }

    if (type === 'composteurs') {
      return [poiComposteur];
    }

    return [];
  });

  const rankMock = mock.method(distanceUtils, 'rankPoisBetweenPoints', (start, end, pois) => {
    rankCalls.push({ start, end, pois });
    return [
      { ...poiComposteur, scoreKm: 1, distanceFromStartKm: 0.4, distanceToEndKm: 0.6 },
      { ...poiToilettes, scoreKm: 2, distanceFromStartKm: 0.8, distanceToEndKm: 1.2 }
    ];
  });

  const buildRouteMock = mock.method(routingDao, 'buildRoute', async (segments) => {
    routeCalls.push(segments);
    return {
      provider: 'internal',
      mode: 'mvp-direct',
      segments,
      note: 'route mockée'
    };
  });

  try {
    const brainService = loadFreshBrainService();

    const start = { lat: 47.2184, lon: -1.5536 };
    const end = { lat: 47.2065, lon: -1.5632 };

    const result = await brainService.buildPlan({
      start,
      end,
      poiTypes: ['toilettes', 'invalide', 'toilettes', 'composteurs'],
      maxPoi: 2
    });

    assert.deepEqual(getPoiCalls, ['toilettes', 'composteurs']);
    assert.equal(rankCalls.length, 1);
    assert.equal(routeCalls.length, 1);

    assert.deepEqual(
      rankCalls[0].pois.map((poi) => `${poi.type}:${poi.sourceId}`),
      ['toilettes:wc-1', 'composteurs:comp-1']
    );

    assert.deepEqual(result.request, {
      start,
      end,
      poiTypes: ['toilettes', 'composteurs'],
      maxPoi: 2
    });

    assert.equal(result.state, 'RESPONSE_READY');
    assert.deepEqual(result.stateTrace, [
      'QUERY_RECEIVED',
      'QUERY_VALIDATED',
      'DATA_REQUESTED',
      'DATA_RECEIVED',
      'POI_AGGREGATED',
      'POI_SELECTED',
      'ROUTE_BUILT',
      'RESPONSE_READY'
    ]);

    assert.deepEqual(result.summary, {
      requestedTypeCount: 2,
      availablePoiCount: 2,
      selectedPoiCount: 2,
      routingProvider: 'internal'
    });

    assert.equal(result.selectedPoi.length, 2);

    assert.deepEqual(routeCalls[0], [
      {
        from: start,
        to: { lat: poiComposteur.lat, lon: poiComposteur.lon }
      },
      {
        from: { lat: poiComposteur.lat, lon: poiComposteur.lon },
        to: { lat: poiToilettes.lat, lon: poiToilettes.lon }
      },
      {
        from: { lat: poiToilettes.lat, lon: poiToilettes.lon },
        to: end
      }
    ]);
  } finally {
    getPoiMock.mock.restore();
    rankMock.mock.restore();
    buildRouteMock.mock.restore();
    delete require.cache[serviceModulePath];
    restoreEnv('MAX_DEFAULT_POI', previousDefaultMaxPoi);
  }
});

test('buildPlan utilise MAX_DEFAULT_POI si maxPoi est absent', { concurrency: false }, async () => {
  const previousDefaultMaxPoi = process.env.MAX_DEFAULT_POI;
  process.env.MAX_DEFAULT_POI = '1';

  const poi1 = { type: 'toilettes', sourceId: 'wc-1', lat: 47.21, lon: -1.55 };
  const poi2 = { type: 'toilettes', sourceId: 'wc-2', lat: 47.22, lon: -1.56 };

  const getPoiMock = mock.method(dataManagerDao, 'getPoiByType', async () => [poi1, poi2]);

  const rankMock = mock.method(distanceUtils, 'rankPoisBetweenPoints', () => [
    { ...poi1, scoreKm: 1, distanceFromStartKm: 0.2, distanceToEndKm: 0.3 },
    { ...poi2, scoreKm: 2, distanceFromStartKm: 0.4, distanceToEndKm: 0.5 }
  ]);

  const buildRouteMock = mock.method(routingDao, 'buildRoute', async (segments) => ({
    provider: 'internal',
    mode: 'mvp-direct',
    segments,
    note: 'route mockée'
  }));

  try {
    const brainService = loadFreshBrainService();

    const result = await brainService.buildPlan({
      start: { lat: 47.2184, lon: -1.5536 },
      end: { lat: 47.2065, lon: -1.5632 },
      poiTypes: ['toilettes']
    });

    assert.equal(result.request.maxPoi, 1);
    assert.equal(result.selectedPoi.length, 1);
    assert.equal(result.summary.selectedPoiCount, 1);
  } finally {
    getPoiMock.mock.restore();
    rankMock.mock.restore();
    buildRouteMock.mock.restore();
    delete require.cache[serviceModulePath];
    restoreEnv('MAX_DEFAULT_POI', previousDefaultMaxPoi);
  }
});

test('buildPlan avec maxPoi = 0 ne garde aucun POI et construit un segment direct start -> end', { concurrency: false }, async () => {
  const poi = { type: 'parkings', sourceId: 'p-1', lat: 47.22, lon: -1.55 };
  const routeCalls = [];

  const getPoiMock = mock.method(dataManagerDao, 'getPoiByType', async () => [poi]);

  const rankMock = mock.method(distanceUtils, 'rankPoisBetweenPoints', () => [
    { ...poi, scoreKm: 1, distanceFromStartKm: 0.2, distanceToEndKm: 0.3 }
  ]);

  const buildRouteMock = mock.method(routingDao, 'buildRoute', async (segments) => {
    routeCalls.push(segments);
    return {
      provider: 'internal',
      mode: 'mvp-direct',
      segments,
      note: 'route mockée'
    };
  });

  try {
    const brainService = loadFreshBrainService();

    const start = { lat: 47.2184, lon: -1.5536 };
    const end = { lat: 47.2065, lon: -1.5632 };

    const result = await brainService.buildPlan({
      start,
      end,
      poiTypes: ['parkings'],
      maxPoi: 0
    });

    assert.equal(result.selectedPoi.length, 0);
    assert.equal(result.summary.selectedPoiCount, 0);

    assert.deepEqual(routeCalls[0], [
      {
        from: start,
        to: end
      }
    ]);
  } finally {
    getPoiMock.mock.restore();
    rankMock.mock.restore();
    buildRouteMock.mock.restore();
    delete require.cache[serviceModulePath];
  }
});

test('buildPlan sans type valide ne demande aucune donnée et saute DATA_REQUESTED / DATA_RECEIVED', { concurrency: false }, async () => {
  const getPoiMock = mock.method(dataManagerDao, 'getPoiByType', async () => {
    throw new Error('Ce mock ne devrait pas être appelé');
  });

  const rankMock = mock.method(distanceUtils, 'rankPoisBetweenPoints', (start, end, pois) => {
    assert.deepEqual(pois, []);
    return [];
  });

  const buildRouteMock = mock.method(routingDao, 'buildRoute', async (segments) => ({
    provider: 'internal',
    mode: 'mvp-direct',
    segments,
    note: 'route mockée'
  }));

  try {
    const brainService = loadFreshBrainService();

    const result = await brainService.buildPlan({
      start: { lat: 47.2184, lon: -1.5536 },
      end: { lat: 47.2065, lon: -1.5632 },
      poiTypes: ['type-inconnu']
    });

    assert.deepEqual(result.request.poiTypes, []);
    assert.ok(!result.stateTrace.includes('DATA_REQUESTED'));
    assert.ok(!result.stateTrace.includes('DATA_RECEIVED'));
    assert.equal(result.summary.requestedTypeCount, 0);
    assert.equal(result.summary.availablePoiCount, 0);
    assert.equal(result.summary.selectedPoiCount, 0);
  } finally {
    getPoiMock.mock.restore();
    rankMock.mock.restore();
    buildRouteMock.mock.restore();
    delete require.cache[serviceModulePath];
  }
});

test('debugPlan retourne les compteurs par type et applique la limite maxPoi', { concurrency: false }, async () => {
  const previousDefaultMaxPoi = process.env.MAX_DEFAULT_POI;
  process.env.MAX_DEFAULT_POI = '2';

  const poi1 = { type: 'toilettes', sourceId: 'wc-1', lat: 47.21, lon: -1.55 };
  const poi2 = { type: 'composteurs', sourceId: 'comp-1', lat: 47.22, lon: -1.56 };
  const poi3 = { type: 'composteurs', sourceId: 'comp-2', lat: 47.23, lon: -1.57 };

  const getPoiMock = mock.method(dataManagerDao, 'getPoiByType', async (type) => {
    if (type === 'toilettes') {
      return [poi1];
    }

    if (type === 'composteurs') {
      return [poi2, poi3];
    }

    return [];
  });

  const rankMock = mock.method(distanceUtils, 'rankPoisBetweenPoints', () => [
    { ...poi2, scoreKm: 1, distanceFromStartKm: 0.1, distanceToEndKm: 0.2 },
    { ...poi1, scoreKm: 2, distanceFromStartKm: 0.3, distanceToEndKm: 0.4 },
    { ...poi3, scoreKm: 3, distanceFromStartKm: 0.5, distanceToEndKm: 0.6 }
  ]);

  try {
    const brainService = loadFreshBrainService();

    const result = await brainService.debugPlan({
      start: { lat: 47.2184, lon: -1.5536 },
      end: { lat: 47.2065, lon: -1.5632 },
      poiTypes: ['toilettes', 'composteurs']
    });

    assert.deepEqual(result.fetchedByType, {
      toilettes: 1,
      composteurs: 2
    });

    assert.equal(result.totalAvailable, 3);
    assert.equal(result.request.maxPoi, 2);
    assert.equal(result.normalizedPreview.length, 2);
    assert.equal(result.normalizedPreview[0].sourceId, 'comp-1');
    assert.equal(result.normalizedPreview[1].sourceId, 'wc-1');
  } finally {
    getPoiMock.mock.restore();
    rankMock.mock.restore();
    delete require.cache[serviceModulePath];
    restoreEnv('MAX_DEFAULT_POI', previousDefaultMaxPoi);
  }
});