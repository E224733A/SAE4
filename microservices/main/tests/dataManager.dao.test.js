const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const daoModulePath = require.resolve('../dao/dataManager.dao');

function loadDaoWithMockedAxios(getImpl) {
  delete require.cache[daoModulePath];

  const createMock = mock.method(axios, 'create', () => ({
    get: getImpl
  }));

  const dao = require('../dao/dataManager.dao');

  return {
    dao,
    restore() {
      createMock.mock.restore();
      delete require.cache[daoModulePath];
    }
  };
}

test('getPoiByType appelle la bonne URL avec params', async () => {
  const calls = [];
  const { dao, restore } = loadDaoWithMockedAxios(async (url, config) => {
    calls.push({ url, config });
    return { data: [{ id: 1, type: 'toilettes' }] };
  });

  try {
    const result = await dao.getPoiByType('toilettes');

    assert.deepEqual(result, [{ id: 1, type: 'toilettes' }]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/db/poi');
    assert.deepEqual(calls[0].config, { params: { type: 'toilettes' } });
  } finally {
    restore();
  }
});

test('getAllPoi appelle la bonne URL sans filtre', async () => {
  const calls = [];
  const { dao, restore } = loadDaoWithMockedAxios(async (url, config) => {
    calls.push({ url, config });
    return { data: [{ id: 1 }, { id: 2 }] };
  });

  try {
    const result = await dao.getAllPoi();

    assert.equal(result.length, 2);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, '/api/db/poi');
    assert.deepEqual(calls[0].config, { params: {} });
  } finally {
    restore();
  }
});

test('getPoiByType mappe une erreur 404 en erreur 502', async () => {
  const { dao, restore } = loadDaoWithMockedAxios(async () => {
    const error = new Error('Not found');
    error.response = { status: 404 };
    throw error;
  });

  try {
    await assert.rejects(
      () => dao.getPoiByType('inexistant'),
      (error) => {
        assert.equal(error.status, 502);
        assert.equal(error.code, 'DATA_MANAGER_BAD_RESPONSE');
        assert.match(error.message, /404/);
        return true;
      }
    );
  } finally {
    restore();
  }
});

test('getAllPoi mappe une erreur 500 en erreur 502', async () => {
  const { dao, restore } = loadDaoWithMockedAxios(async () => {
    const error = new Error('Server error');
    error.response = { status: 500 };
    throw error;
  });

  try {
    await assert.rejects(
      () => dao.getAllPoi(),
      (error) => {
        assert.equal(error.status, 502);
        assert.equal(error.code, 'DATA_MANAGER_BAD_RESPONSE');
        assert.match(error.message, /500/);
        return true;
      }
    );
  } finally {
    restore();
  }
});
