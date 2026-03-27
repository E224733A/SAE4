import poiDao from '../dao/poiDao.mjs';
import fetcherDao from '../dao/fetcherDao.mjs';
import { ALLOWED_TYPES, getTtlSeconds } from '../config/cacheConfig.mjs';

function assertKnownType(type) {
  if (!ALLOWED_TYPES.includes(type)) {
    const error = new Error(`Type inconnu : ${type}`);
    error.status = 400;
    error.code = 'UNKNOWN_TYPE';
    throw error;
  }
}

function isExpired(cacheEntry) {
  if (!cacheEntry?.expiresAt) {
    return true;
  }

  return new Date(cacheEntry.expiresAt).getTime() <= Date.now();
}

async function refreshType(type, initialState = 'CACHE_MISS') {
  assertKnownType(type);

  const stateTrace = ['READ_REQUESTED', initialState, 'FETCHER_REQUESTED'];

  try {
    const fetched = await fetcherDao.fetchDataset(type);

    const items = Array.isArray(fetched?.items) ? fetched.items : [];
    const ttlSeconds = getTtlSeconds(type);
    const fetchedAt = fetched?.fetchedAt ? new Date(fetched.fetchedAt) : new Date();
    const expiresAt = new Date(fetchedAt.getTime() + ttlSeconds * 1000);

    const saved = await poiDao.upsertTypeData(type, items, {
      source: 'fetcher-opendata',
      fetchedAt,
      expiresAt
    });

    stateTrace.push('CACHE_UPDATED');
    stateTrace.push('RESPONSE_READY');

    return {
      state: 'RESPONSE_READY',
      stateTrace,
      type,
      items,
      cache: {
        fetchedAt: saved.fetchedAt,
        expiresAt: saved.expiresAt,
        itemCount: saved.itemCount
      }
    };
  } catch (error) {
    stateTrace.push('REFRESH_FAILED');
    error.stateTrace = stateTrace;
    throw error;
  }
}

async function ensureFreshType(type) {
  assertKnownType(type);

  const existing = await poiDao.findByType(type);

  if (!existing) {
    return refreshType(type, 'CACHE_MISS');
  }

  if (isExpired(existing)) {
    return refreshType(type, 'CACHE_EXPIRED');
  }

  return {
    state: 'RESPONSE_READY',
    stateTrace: ['READ_REQUESTED', 'CACHE_HIT', 'RESPONSE_READY'],
    type,
    items: existing.items || [],
    cache: {
      fetchedAt: existing.fetchedAt,
      expiresAt: existing.expiresAt,
      itemCount: existing.itemCount
    }
  };
}

async function inspectCache(type) {
  assertKnownType(type);

  const existing = await poiDao.findByType(type);

  if (!existing) {
    return {
      state: 'CACHE_MISS',
      type,
      cache: null
    };
  }

  if (isExpired(existing)) {
    return {
      state: 'CACHE_EXPIRED',
      type,
      cache: {
        fetchedAt: existing.fetchedAt,
        expiresAt: existing.expiresAt,
        itemCount: existing.itemCount
      }
    };
  }

  return {
    state: 'CACHE_HIT',
    type,
    cache: {
      fetchedAt: existing.fetchedAt,
      expiresAt: existing.expiresAt,
      itemCount: existing.itemCount
    }
  };
}

async function getAllCachedPoi() {
  const entries = await poiDao.findAll();
  return entries.flatMap((entry) => entry.items || []);
}

export default {
  ensureFreshType,
  refreshType,
  inspectCache,
  getAllCachedPoi
};