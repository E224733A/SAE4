'use strict';
const { test, describe, mock } = require('node:test');
const assert = require('node:assert/strict');

const nodeFetch = require('node-fetch');
const daoModulePath = require.resolve('../../dao/opendata.dao');

function loadDaoWithMockedFetch(fetchImpl) {
  delete require.cache[daoModulePath];

  // Mock node-fetch dans le cache
  const fetchModulePath = require.resolve('node-fetch');
  const original = require.cache[fetchModulePath]?.exports;

  require.cache[fetchModulePath] = {
    id: fetchModulePath,
    filename: fetchModulePath,
    loaded: true,
    exports: fetchImpl
  };

  const dao = require('../../dao/opendata.dao');

  return {
    dao,
    restore() {
      delete require.cache[daoModulePath];
      if (original) {
        require.cache[fetchModulePath] = {
          id: fetchModulePath,
          filename: fetchModulePath,
          loaded: true,
          exports: original
        };
      } else {
        delete require.cache[fetchModulePath];
      }
    }
  };
}

describe('opendata.dao – fetchDataset', () => {
  test('appelle l\'URL correcte pour toilettes et parse le JSON', async () => {
    const fakePayload = { results: [{ id: 1 }] };
    const calls = [];

    const fakeFetch = async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => fakePayload
      };
    };
    fakeFetch.default = fakeFetch;

    const { dao, restore } = loadDaoWithMockedFetch(fakeFetch);
    try {
      const result = await dao.fetchDataset('toilettes');
      assert.deepEqual(result, fakePayload);
      assert.ok(calls[0].includes('toilettes-publiques-nantes'));
    } finally {
      restore();
    }
  });

  test('lève une erreur pour un dataset inconnu', async () => {
    const { dao, restore } = loadDaoWithMockedFetch(async () => ({}));
    try {
      await assert.rejects(
        () => dao.fetchDataset('dataset_qui_nexiste_pas'),
        /Dataset inconnu/
      );
    } finally {
      restore();
    }
  });

  test('lève une erreur si la réponse HTTP n\'est pas ok', async () => {
    const fakeFetch = async () => ({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    });
    fakeFetch.default = fakeFetch;

    const { dao, restore } = loadDaoWithMockedFetch(fakeFetch);
    try {
      await assert.rejects(
        () => dao.fetchDataset('toilettes'),
        /Erreur API Nantes: 500/
      );
    } finally {
      restore();
    }
  });

  test('DATASET_IDS contient les 4 clés attendues', () => {
    const dao = require('../../dao/opendata.dao');
    const keys = Object.keys(dao.DATASET_IDS);
    assert.ok(keys.includes('toilettes'));
    assert.ok(keys.includes('parkings'));
    assert.ok(keys.includes('parkingsStatic'));
    assert.ok(keys.includes('composteurs'));
  });

  test('getToilettes, getParkings, getComposteurs appellent fetchDataset avec la bonne clé', async () => {
    const calledWith = [];
    const fakeFetch = async (url) => {
      calledWith.push(url);
      return { ok: true, json: async () => ({ results: [] }) };
    };
    fakeFetch.default = fakeFetch;

    const { dao, restore } = loadDaoWithMockedFetch(fakeFetch);
    try {
      await dao.getToilettes();
      await dao.getParkings();
      await dao.getComposteurs();

      assert.ok(calledWith[0].includes('toilettes'));
      assert.ok(calledWith[1].includes('parkings'));
      assert.ok(calledWith[2].includes('composteurs'));
    } finally {
      restore();
    }
  });
});