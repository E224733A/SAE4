import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

const daoModuleUrl = new URL('../api/dao/fetcherDao.mjs', import.meta.url);

async function loadFreshFetcherDao() {
  return import(`${daoModuleUrl.href}?t=${Date.now()}-${Math.random()}`);
}

function restoreEnv(name, previousValue) {
  if (previousValue === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = previousValue;
  }
}

test('fetchDataset appelle le bon endpoint et retourne les données', async () => {
  const previous = process.env.FETCHER_URL;
  process.env.FETCHER_URL = 'http://fetcher-test:3001';

  const originalCreate = axios.create;
  const calls = [];

  axios.create = () => ({
    async get(url) {
      calls.push(url);
      return {
        data: {
          datasetKey: 'toilettes',
          items: [{ sourceId: 'wc-1' }]
        }
      };
    }
  });

  try {
    const { default: fetcherDao } = await loadFreshFetcherDao();
    const result = await fetcherDao.fetchDataset('toilettes');

    assert.deepEqual(calls, ['/internal/fetch/toilettes']);
    assert.deepEqual(result, {
      datasetKey: 'toilettes',
      items: [{ sourceId: 'wc-1' }]
    });
  } finally {
    axios.create = originalCreate;
    restoreEnv('FETCHER_URL', previous);
  }
});

test('fetchDataset mappe ECONNREFUSED en FETCHER_UNAVAILABLE', async () => {
  const previous = process.env.FETCHER_URL;
  process.env.FETCHER_URL = 'http://fetcher-test:3001';

  const originalCreate = axios.create;

  axios.create = () => ({
    async get() {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      throw error;
    }
  });

  try {
    const { default: fetcherDao } = await loadFreshFetcherDao();

    await assert.rejects(
      () => fetcherDao.fetchDataset('toilettes'),
      (error) => {
        assert.equal(error.status, 503);
        assert.equal(error.code, 'FETCHER_UNAVAILABLE');
        assert.match(error.message, /fetcher-opendata est indisponible/);
        return true;
      }
    );
  } finally {
    axios.create = originalCreate;
    restoreEnv('FETCHER_URL', previous);
  }
});

test('fetchDataset mappe une erreur HTTP du fetcher en FETCHER_BAD_RESPONSE', async () => {
  const originalCreate = axios.create;

  axios.create = () => ({
    async get() {
      const error = new Error('Bad response');
      error.response = { status: 500 };
      throw error;
    }
  });

  try {
    const { default: fetcherDao } = await loadFreshFetcherDao();

    await assert.rejects(
      () => fetcherDao.fetchDataset('parkings'),
      (error) => {
        assert.equal(error.status, 502);
        assert.equal(error.code, 'FETCHER_BAD_RESPONSE');
        assert.match(error.message, /erreur 500/);
        return true;
      }
    );
  } finally {
    axios.create = originalCreate;
  }
});
