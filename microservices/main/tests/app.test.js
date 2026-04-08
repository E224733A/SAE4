const test = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const request = require('supertest');

const app = require('../app');
const brainService = require('../services/brain.service');

test('GET / retourne le message de disponibilité du service', { concurrency: false }, async () => {
  const response = await request(app)
    .get('/')
    .expect(200);

  assert.equal(response.text, 'Le microservice main / brain est opérationnel.');
});

test('GET /api/health retourne un statut ok', { concurrency: false }, async () => {
  const response = await request(app)
    .get('/api/health')
    .expect(200);

  assert.deepEqual(response.body, {
    service: 'main-brain',
    status: 'ok'
  });
});

test('GET /api/poi/available-types retourne les types fournis par le service métier', { concurrency: false }, async () => {
  const serviceMock = mock.method(brainService, 'getAvailableTypes', () => [
    'toilettes',
    'parkings'
  ]);

  try {
    const response = await request(app)
      .get('/api/poi/available-types')
      .expect(200);

    assert.deepEqual(response.body, {
      types: ['toilettes', 'parkings']
    });

    assert.equal(serviceMock.mock.callCount(), 1);
  } finally {
    serviceMock.mock.restore();
  }
});

test('POST /api/itinerary/plan retourne 400 si la requête est invalide', { concurrency: false }, async () => {
  const buildPlanMock = mock.method(brainService, 'buildPlan', async () => {
    throw new Error('Le service ne devrait pas être appelé sur une requête invalide');
  });

  try {
    const response = await request(app)
      .post('/api/itinerary/plan')
      .send({
        start: { lat: 999, lon: -1.5536 },
        end: { lat: 47.2065, lon: -1.5632 }
      })
      .expect(400);

    assert.equal(response.body.error, 'Requête invalide.');
    assert.ok(Array.isArray(response.body.details));
    assert.ok(response.body.details.some((msg) => msg.includes('start doit contenir')));

    assert.equal(buildPlanMock.mock.callCount(), 0);
  } finally {
    buildPlanMock.mock.restore();
  }
});

test('POST /api/itinerary/plan retourne 200 et le JSON calculé quand la requête est valide', { concurrency: false }, async () => {
  const payload = {
    start: { lat: 47.2184, lon: -1.5536 },
    end: { lat: 47.2065, lon: -1.5632 },
    poiTypes: ['toilettes'],
    maxPoi: 1
  };

  const mockedResult = {
    state: 'RESPONSE_READY',
    stateTrace: [
      'QUERY_RECEIVED',
      'QUERY_VALIDATED',
      'DATA_REQUESTED',
      'DATA_RECEIVED',
      'POI_AGGREGATED',
      'POI_SELECTED',
      'ROUTE_BUILT',
      'RESPONSE_READY'
    ],
    request: payload,
    summary: {
      requestedTypeCount: 1,
      availablePoiCount: 2,
      selectedPoiCount: 1,
      routingProvider: 'internal'
    },
    selectedPoi: [
      {
        type: 'toilettes',
        sourceId: 'wc-1',
        lat: 47.21,
        lon: -1.55
      }
    ],
    route: {
      provider: 'internal',
      mode: 'mvp-direct',
      segments: [],
      note: 'route mockée'
    }
  };

  const buildPlanMock = mock.method(brainService, 'buildPlan', async (body) => {
    assert.deepEqual(body, payload);
    return mockedResult;
  });

  try {
    const response = await request(app)
      .post('/api/itinerary/plan')
      .send(payload)
      .expect(200);

    assert.deepEqual(response.body, mockedResult);
    assert.equal(buildPlanMock.mock.callCount(), 1);
  } finally {
    buildPlanMock.mock.restore();
  }
});

test('POST /api/itinerary/plan propage une erreur métier vers le middleware global', { concurrency: false }, async () => {
  const error = new Error('Data-manager indisponible');
  error.status = 502;
  error.code = 'DATA_MANAGER_BAD_RESPONSE';

  const buildPlanMock = mock.method(brainService, 'buildPlan', async () => {
    throw error;
  });

  try {
    const response = await request(app)
      .post('/api/itinerary/plan')
      .send({
        start: { lat: 47.2184, lon: -1.5536 },
        end: { lat: 47.2065, lon: -1.5632 },
        poiTypes: ['toilettes']
      })
      .expect(502);

    assert.deepEqual(response.body, {
      error: 'Data-manager indisponible',
      code: 'DATA_MANAGER_BAD_RESPONSE'
    });
  } finally {
    buildPlanMock.mock.restore();
  }
});

test('POST /api/itinerary/debug retourne 400 si la requête est invalide', { concurrency: false }, async () => {
  const debugMock = mock.method(brainService, 'debugPlan', async () => {
    throw new Error('Le service ne devrait pas être appelé sur une requête invalide');
  });

  try {
    const response = await request(app)
      .post('/api/itinerary/debug')
      .send({
        start: { lat: 47.2184, lon: -1.5536 }
      })
      .expect(400);

    assert.equal(response.body.error, 'Requête invalide.');
    assert.ok(Array.isArray(response.body.details));
    assert.ok(response.body.details.some((msg) => msg.includes('end doit contenir')));

    assert.equal(debugMock.mock.callCount(), 0);
  } finally {
    debugMock.mock.restore();
  }
});

test('POST /api/itinerary/debug retourne les données de debug quand la requête est valide', { concurrency: false }, async () => {
  const mockedResult = {
    request: {
      start: { lat: 47.2184, lon: -1.5536 },
      end: { lat: 47.2065, lon: -1.5632 },
      poiTypes: ['composteurs'],
      maxPoi: 2
    },
    fetchedByType: { composteurs: 3 },
    totalAvailable: 3,
    normalizedPreview: [
      {
        type: 'composteurs',
        sourceId: 'comp-1',
        lat: 47.21,
        lon: -1.55
      }
    ]
  };

  const debugMock = mock.method(brainService, 'debugPlan', async () => mockedResult);

  try {
    const response = await request(app)
      .post('/api/itinerary/debug')
      .send({
        start: { lat: 47.2184, lon: -1.5536 },
        end: { lat: 47.2065, lon: -1.5632 },
        poiTypes: ['composteurs'],
        maxPoi: 2
      })
      .expect(200);

    assert.deepEqual(response.body, mockedResult);
    assert.equal(debugMock.mock.callCount(), 1);
  } finally {
    debugMock.mock.restore();
  }
});

test('une route inconnue retourne 404', { concurrency: false }, async () => {
  const response = await request(app)
    .get('/api/route/inconnue')
    .expect(404);

  assert.deepEqual(response.body, {
    error: 'Route introuvable.'
  });
});