import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import request from 'supertest';

import app from '../app.mjs';
import cacheService from '../api/services/cacheService.mjs';

test('GET / retourne le message du service', async () => {
  const response = await request(app).get('/').expect(200);
  assert.equal(response.text, 'Data Manager opérationnel.');
});

test('GET /api/health retourne un statut ok', async () => {
  const response = await request(app).get('/api/health').expect(200);

  assert.deepEqual(response.body, {
    service: 'data-manager',
    status: 'ok'
  });
});

test('GET /api/db/poi?type=toilettes retourne les items du type demandé', async () => {
  const ensureMock = mock.method(cacheService, 'ensureFreshType', async (type) => {
    assert.equal(type, 'toilettes');
    return {
      items: [{ sourceId: 'wc-1' }, { sourceId: 'wc-2' }]
    };
  });

  try {
    const response = await request(app)
      .get('/api/db/poi?type=toilettes')
      .expect(200);

    assert.deepEqual(response.body, [
      { sourceId: 'wc-1' },
      { sourceId: 'wc-2' }
    ]);
  } finally {
    ensureMock.mock.restore();
  }
});

test('GET /api/db/poi sans type retourne tous les POI du cache', async () => {
  const allMock = mock.method(cacheService, 'getAllCachedPoi', async () => [
    { sourceId: 'wc-1' },
    { sourceId: 'p-1' }
  ]);

  try {
    const response = await request(app)
      .get('/api/db/poi')
      .expect(200);

    assert.deepEqual(response.body, [
      { sourceId: 'wc-1' },
      { sourceId: 'p-1' }
    ]);
  } finally {
    allMock.mock.restore();
  }
});

test('GET /api/db/cache/:type retourne l’état du cache', async () => {
  const inspectMock = mock.method(cacheService, 'inspectCache', async (type) => {
    assert.equal(type, 'parkings');
    return {
      state: 'CACHE_HIT',
      type: 'parkings',
      cache: { itemCount: 12 }
    };
  });

  try {
    const response = await request(app)
      .get('/api/db/cache/parkings')
      .expect(200);

    assert.deepEqual(response.body, {
      state: 'CACHE_HIT',
      type: 'parkings',
      cache: { itemCount: 12 }
    });
  } finally {
    inspectMock.mock.restore();
  }
});

test('GET /api/db/poi?type=bad propage une erreur du service', async () => {
  const ensureMock = mock.method(cacheService, 'ensureFreshType', async () => {
    const error = new Error('Type inconnu : bad');
    error.status = 400;
    throw error;
  });

  try {
    await request(app)
      .get('/api/db/poi?type=bad')
      .expect(400);
  } finally {
    ensureMock.mock.restore();
  }
});

test('GET /api/db/cache/:type propage une erreur du service', async () => {
  const inspectMock = mock.method(cacheService, 'inspectCache', async () => {
    const error = new Error('Erreur interne');
    error.status = 500;
    throw error;
  });

  try {
    await request(app)
      .get('/api/db/cache/toilettes')
      .expect(500);
  } finally {
    inspectMock.mock.restore();
  }
});