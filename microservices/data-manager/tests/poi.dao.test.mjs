import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

import POICacheModel from '../api/model/poiModel.mjs';
import poiDao from '../api/dao/poiDao.mjs';

test('findByType appelle findOne avec le bon filtre', async () => {
  const leanMock = mock.fn(async () => ({ type: 'toilettes', itemCount: 2 }));
  const findOneMock = mock.method(POICacheModel, 'findOne', (filter) => {
    assert.deepEqual(filter, { type: 'toilettes' });
    return { lean: leanMock };
  });

  try {
    const result = await poiDao.findByType('toilettes');
    assert.deepEqual(result, { type: 'toilettes', itemCount: 2 });
  } finally {
    findOneMock.mock.restore();
  }
});

test('findAll appelle find avec un filtre vide', async () => {
  const leanMock = mock.fn(async () => [{ type: 'parkings', itemCount: 4 }]);
  const findMock = mock.method(POICacheModel, 'find', (filter) => {
    assert.deepEqual(filter, {});
    return { lean: leanMock };
  });

  try {
    const result = await poiDao.findAll();
    assert.deepEqual(result, [{ type: 'parkings', itemCount: 4 }]);
  } finally {
    findMock.mock.restore();
  }
});

test('upsertTypeData calcule itemCount et transmet les métadonnées', async () => {
  const now = new Date('2026-04-08T10:00:00.000Z');
  const expiresAt = new Date('2026-04-08T11:00:00.000Z');

  const leanMock = mock.fn(async () => ({
    type: 'composteurs',
    itemCount: 2,
    source: 'fetcher-opendata',
    fetchedAt: now,
    expiresAt
  }));

  const findOneAndUpdateMock = mock.method(
    POICacheModel,
    'findOneAndUpdate',
    (filter, update, options) => {
      assert.deepEqual(filter, { type: 'composteurs' });
      assert.equal(update.type, 'composteurs');
      assert.equal(update.itemCount, 2);
      assert.equal(update.source, 'fetcher-opendata');
      assert.deepEqual(update.items, [{ sourceId: 'c-1' }, { sourceId: 'c-2' }]);
      assert.equal(update.fetchedAt, now);
      assert.equal(update.expiresAt, expiresAt);

      assert.deepEqual(options, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      });

      return { lean: leanMock };
    }
  );

  try {
    const result = await poiDao.upsertTypeData(
      'composteurs',
      [{ sourceId: 'c-1' }, { sourceId: 'c-2' }],
      {
        source: 'fetcher-opendata',
        fetchedAt: now,
        expiresAt
      }
    );

    assert.equal(result.itemCount, 2);
  } finally {
    findOneAndUpdateMock.mock.restore();
  }
});

test('upsertTypeData met itemCount à 0 si items n’est pas un tableau', async () => {
  const leanMock = mock.fn(async () => ({ type: 'toilettes', itemCount: 0 }));

  const findOneAndUpdateMock = mock.method(
    POICacheModel,
    'findOneAndUpdate',
    (filter, update) => {
      assert.deepEqual(filter, { type: 'toilettes' });
      assert.equal(update.itemCount, 0);
      return { lean: leanMock };
    }
  );

  try {
    const result = await poiDao.upsertTypeData('toilettes', null, {});
    assert.equal(result.itemCount, 0);
  } finally {
    findOneAndUpdateMock.mock.restore();
  }
});