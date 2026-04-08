const test = require('node:test');
const assert = require('node:assert/strict');
const routingDao = require('../dao/routing.dao');

test('buildRoute retourne un trajet simplifie avec provider par defaut', async () => {
  const previousProvider = process.env.ROUTING_PROVIDER;
  delete process.env.ROUTING_PROVIDER;

  const segments = [{ from: 'A', to: 'B' }];
  const result = await routingDao.buildRoute(segments);

  assert.equal(result.provider, 'internal');
  assert.equal(result.mode, 'mvp-direct');
  assert.deepEqual(result.segments, segments);
  assert.match(result.note, /aucune API externe/);

  if (previousProvider === undefined) {
    delete process.env.ROUTING_PROVIDER;
  } else {
    process.env.ROUTING_PROVIDER = previousProvider;
  }
});

test('buildRoute utilise ROUTING_PROVIDER si defini', async () => {
  const previousProvider = process.env.ROUTING_PROVIDER;
  process.env.ROUTING_PROVIDER = 'osrm';

  const result = await routingDao.buildRoute([]);

  assert.equal(result.provider, 'osrm');

  if (previousProvider === undefined) {
    delete process.env.ROUTING_PROVIDER;
  } else {
    process.env.ROUTING_PROVIDER = previousProvider;
  }
});
