import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

import cacheService from '../api/services/cacheService.mjs';
import poiDao from '../api/dao/poiDao.mjs';
import fetcherDao from '../api/dao/fetcherDao.mjs';

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

test('ensureFreshType rejette un type inconnu', async () => {
  await assert.rejects(
    () => cacheService.ensureFreshType('type-inconnu'),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.code, 'UNKNOWN_TYPE');
      assert.match(error.message, /Type inconnu/);
      return true;
    }
  );
});

test('ensureFreshType fait un refresh sur cache miss', async () => {
  const previous = process.env.TOILETTES_TTL_SECONDS;
  process.env.TOILETTES_TTL_SECONDS = '120';

  const fetchedAt = '2026-04-08T10:00:00.000Z';
  const savedEntry = {
    fetchedAt: new Date(fetchedAt),
    expiresAt: new Date('2026-04-08T10:02:00.000Z'),
    itemCount: 2
  };

  const findByTypeMock = mock.method(poiDao, 'findByType', async () => null);
  const fetchDatasetMock = mock.method(fetcherDao, 'fetchDataset', async (type) => {
    assert.equal(type, 'toilettes');
    return {
      fetchedAt,
      items: [
        { sourceId: 'wc-1', type: 'toilettes' },
        { sourceId: 'wc-2', type: 'toilettes' }
      ]
    };
  });

  const upsertMock = mock.method(poiDao, 'upsertTypeData', async (type, items, metadata) => {
    assert.equal(type, 'toilettes');
    assert.equal(items.length, 2);
    assert.equal(metadata.source, 'fetcher-opendata');
    return savedEntry;
  });

  try {
    const result = await cacheService.ensureFreshType('toilettes');

    assert.equal(result.state, 'RESPONSE_READY');
    assert.deepEqual(result.stateTrace, [
      'READ_REQUESTED',
      'CACHE_MISS',
      'FETCHER_REQUESTED',
      'CACHE_UPDATED',
      'RESPONSE_READY'
    ]);
    assert.equal(result.type, 'toilettes');
    assert.equal(result.items.length, 2);
    assert.equal(result.cache.itemCount, 2);
  } finally {
    findByTypeMock.mock.restore();
    fetchDatasetMock.mock.restore();
    upsertMock.mock.restore();
    restoreEnv('TOILETTES_TTL_SECONDS', previous);
  }
});

test('ensureFreshType fait un refresh sur cache expiré', async () => {
  const expiredEntry = {
    type: 'parkings',
    items: [{ sourceId: 'p-1' }],
    fetchedAt: new Date('2026-04-08T09:00:00.000Z'),
    expiresAt: new Date('2026-04-08T09:01:00.000Z'),
    itemCount: 1
  };

  const refreshedEntry = {
    fetchedAt: new Date('2026-04-08T10:00:00.000Z'),
    expiresAt: new Date('2026-04-08T10:05:00.000Z'),
    itemCount: 1
  };

  const findByTypeMock = mock.method(poiDao, 'findByType', async () => expiredEntry);
  const fetchDatasetMock = mock.method(fetcherDao, 'fetchDataset', async () => ({
    fetchedAt: '2026-04-08T10:00:00.000Z',
    items: [{ sourceId: 'p-2', type: 'parkings' }]
  }));
  const upsertMock = mock.method(poiDao, 'upsertTypeData', async () => refreshedEntry);

  try {
    const result = await cacheService.ensureFreshType('parkings');

    assert.deepEqual(result.stateTrace, [
      'READ_REQUESTED',
      'CACHE_EXPIRED',
      'FETCHER_REQUESTED',
      'CACHE_UPDATED',
      'RESPONSE_READY'
    ]);
    assert.equal(result.items[0].sourceId, 'p-2');
  } finally {
    findByTypeMock.mock.restore();
    fetchDatasetMock.mock.restore();
    upsertMock.mock.restore();
  }
});

test('ensureFreshType retourne immédiatement le cache sur cache hit', async () => {
  const entry = {
    type: 'composteurs',
    items: [{ sourceId: 'c-1', type: 'composteurs' }],
    fetchedAt: new Date('2026-04-08T10:00:00.000Z'),
    expiresAt: new Date('2099-04-08T10:00:00.000Z'),
    itemCount: 1
  };

  const findByTypeMock = mock.method(poiDao, 'findByType', async () => entry);
  const fetchDatasetMock = mock.method(fetcherDao, 'fetchDataset', async () => {
    throw new Error('Ne devrait pas être appelé');
  });

  try {
    const result = await cacheService.ensureFreshType('composteurs');

    assert.equal(result.state, 'RESPONSE_READY');
    assert.deepEqual(result.stateTrace, [
      'READ_REQUESTED',
      'CACHE_HIT',
      'RESPONSE_READY'
    ]);
    assert.equal(result.items.length, 1);
    assert.equal(fetchDatasetMock.mock.callCount(), 0);
  } finally {
    findByTypeMock.mock.restore();
    fetchDatasetMock.mock.restore();
  }
});

test('refreshType ajoute REFRESH_FAILED dans la trace si le fetcher échoue', async () => {
  const fetchDatasetMock = mock.method(fetcherDao, 'fetchDataset', async () => {
    const error = new Error('Fetcher indisponible');
    error.status = 503;
    error.code = 'FETCHER_UNAVAILABLE';
    throw error;
  });

  try {
    await assert.rejects(
      () => cacheService.refreshType('toilettes'),
      (error) => {
        assert.equal(error.status, 503);
        assert.equal(error.code, 'FETCHER_UNAVAILABLE');
        assert.deepEqual(error.stateTrace, [
          'READ_REQUESTED',
          'CACHE_MISS',
          'FETCHER_REQUESTED',
          'REFRESH_FAILED'
        ]);
        return true;
      }
    );
  } finally {
    fetchDatasetMock.mock.restore();
  }
});

test('inspectCache retourne CACHE_MISS quand rien n’est stocké', async () => {
  const findByTypeMock = mock.method(poiDao, 'findByType', async () => null);

  try {
    const result = await cacheService.inspectCache('toilettes');

    assert.deepEqual(result, {
      state: 'CACHE_MISS',
      type: 'toilettes',
      cache: null
    });
  } finally {
    findByTypeMock.mock.restore();
  }
});

test('inspectCache retourne CACHE_EXPIRED quand l’entrée existe mais est expirée', async () => {
  const findByTypeMock = mock.method(poiDao, 'findByType', async () => ({
    fetchedAt: new Date('2026-04-08T08:00:00.000Z'),
    expiresAt: new Date('2026-04-08T08:01:00.000Z'),
    itemCount: 4
  }));

  try {
    const result = await cacheService.inspectCache('parkings');

    assert.equal(result.state, 'CACHE_EXPIRED');
    assert.equal(result.type, 'parkings');
    assert.equal(result.cache.itemCount, 4);
  } finally {
    findByTypeMock.mock.restore();
  }
});

test('inspectCache retourne CACHE_HIT quand l’entrée existe et n’est pas expirée', async () => {
  const findByTypeMock = mock.method(poiDao, 'findByType', async () => ({
    fetchedAt: new Date('2026-04-08T10:00:00.000Z'),
    expiresAt: new Date('2099-04-08T10:01:00.000Z'),
    itemCount: 3
  }));

  try {
    const result = await cacheService.inspectCache('composteurs');

    assert.equal(result.state, 'CACHE_HIT');
    assert.equal(result.cache.itemCount, 3);
  } finally {
    findByTypeMock.mock.restore();
  }
});

test('getAllCachedPoi agrège tous les items de toutes les entrées du cache', async () => {
  const findAllMock = mock.method(poiDao, 'findAll', async () => [
    {
      type: 'toilettes',
      items: [{ sourceId: 'wc-1' }, { sourceId: 'wc-2' }]
    },
    {
      type: 'parkings',
      items: [{ sourceId: 'p-1' }]
    },
    {
      type: 'composteurs',
      items: []
    }
  ]);

  try {
    const result = await cacheService.getAllCachedPoi();

    assert.deepEqual(result, [
      { sourceId: 'wc-1' },
      { sourceId: 'wc-2' },
      { sourceId: 'p-1' }
    ]);
  } finally {
    findAllMock.mock.restore();
  }
});