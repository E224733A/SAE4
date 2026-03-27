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

async function refreshType(type) {
  assertKnownType(type);

  const stateTrace = [
    'READ_REQUESTED',
    'CACHE_MISS_OR_EXPIRED',
    'FETCHER_REQUESTED'
  ];

  const fetched = await fetcherDao.fetchDataset(type);
  stateTrace.push('FETCHER_RESPONSE_RECEIVED');

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
    state: 'CACHE_UPDATED',
    stateTrace,
    type,
    itemCount: saved.itemCount,
    fetchedAt: saved.fetchedAt,
    expiresAt: saved.expiresAt
  };
}

async function ensureFreshType(type) {
  assertKnownType(type);

  const existing = await poiDao.findByType(type);

  if (existing && !isExpired(existing)) {
    return {
      state: 'CACHE_HIT',
      type,
      items: existing.items,
      cache: {
        fetchedAt: existing.fetchedAt,
        expiresAt: existing.expiresAt,
        itemCount: existing.itemCount
      }
    };
  }

  const refreshed = await refreshType(type);
  const freshEntry = await poiDao.findByType(type);

  return {
    state: existing ? 'CACHE_REFRESHED' : 'CACHE_MISS_REFRESHED',
    type,
    refresh: refreshed,
    items: freshEntry?.items || [],
    cache: freshEntry
      ? {
          fetchedAt: freshEntry.fetchedAt,
          expiresAt: freshEntry.expiresAt,
          itemCount: freshEntry.itemCount
        }
      : null
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

  return {
    state: isExpired(existing) ? 'CACHE_EXPIRED' : 'CACHE_HIT',
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