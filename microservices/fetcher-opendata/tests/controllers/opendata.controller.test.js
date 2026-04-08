'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const controllerPath = require.resolve('../../controllers/opendata.controller');
const servicePath = require.resolve('../../services/fetchDataset.service');

function loadControllerWithMockedService(serviceImpl) {
  delete require.cache[controllerPath];
  delete require.cache[servicePath];

  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: serviceImpl
  };

  return require('../../controllers/opendata.controller');
}


function mockRes() {
  const res = { _status: 200, _data: null };
  res.status = (code) => { res._status = code; return res; };
  res.json = (data) => { res._data = data; return res; };
  return res;
}

describe('opendata.controller – fetchDataset', () => {
  test('retourne 200 avec les données si le service réussit', async () => {
    const fakeResult = { state: 'NORMALIZATION_COMPLETED', items: [] };
    const controller = loadControllerWithMockedService({
      fetchAndNormalizeDataset: async () => fakeResult
    });

    const req = { params: { datasetKey: 'toilettes' } };
    const res = mockRes();
    const next = (err) => { throw err; };

    await controller.fetchDataset(req, res, next);

    assert.equal(res._status, 200);
    assert.deepEqual(res._data, fakeResult);
  });

  test('appelle next(error) si le service lève une exception', async () => {
    const fakeError = new Error('Erreur service');
    fakeError.status = 404;

    const controller = loadControllerWithMockedService({
      fetchAndNormalizeDataset: async () => { throw fakeError; }
    });

    const req = { params: { datasetKey: 'inconnu' } };
    const res = mockRes();

    let caughtError = null;
    const next = (err) => { caughtError = err; };

    
    await controller.fetchDataset(req, res, next);

    assert.ok(caughtError !== null);
    assert.equal(caughtError.status, 404);
  });
});