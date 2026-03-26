const openDataDAO = require('../dao/opendata.dao');
const { extractRecords } = require('./normalizers/common');
const { datasetNormalizers } = require('./normalizers');

function normalizeMergeKey(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bparking\b/g, '')
    .replace(/\bcote\b/g, '')
    .replace(/\bgare\b/g, '')
    .replace(/[^a-z0-9]+/g, '');

  return normalized === '' ? null : normalized;
}

function buildParkingStaticIndexes(staticRecords) {
  const byId = new Map();
  const byName = new Map();
  const all = [];

  for (const record of staticRecords) {
    all.push(record);

    const idCandidates = [
      record?.grp_identifiant,
      record?.identifiant,
      record?.idobj,
      record?.id,
      record?.recordid
    ];

    const nameCandidates = [
      record?.grp_nom,
      record?.nom,
      record?.nom_complet,
      record?.libelle,
      record?.name,
      record?.titre,
      record?.site_web
    ];

    for (const value of idCandidates) {
      const key = normalizeMergeKey(value);
      if (key && !byId.has(key)) {
        byId.set(key, record);
      }
    }

    for (const value of nameCandidates) {
      const key = normalizeMergeKey(value);
      if (key && !byName.has(key)) {
        byName.set(key, record);
      }
    }
  }

  return { byId, byName, all };
}

function findParkingStaticRecord(availabilityRecord, indexes) {
  const { byId, byName, all } = indexes;

  const idCandidates = [
    availabilityRecord?.grp_identifiant,
    availabilityRecord?.identifiant,
    availabilityRecord?.idobj,
    availabilityRecord?.id,
    availabilityRecord?.recordid
  ];

  const nameCandidates = [
    availabilityRecord?.grp_nom,
    availabilityRecord?.nom,
    availabilityRecord?.nom_complet,
    availabilityRecord?.libelle,
    availabilityRecord?.name,
    availabilityRecord?.titre
  ];

  for (const value of idCandidates) {
    const key = normalizeMergeKey(value);
    if (key && byId.has(key)) {
      return byId.get(key);
    }
  }

  for (const value of nameCandidates) {
    const key = normalizeMergeKey(value);
    if (key && byName.has(key)) {
      return byName.get(key);
    }
  }

  for (const value of nameCandidates) {
    const key = normalizeMergeKey(value);
    if (!key) {
      continue;
    }

    const found = all.find((record) => {
      const staticKeys = [
        record?.grp_nom,
        record?.nom,
        record?.nom_complet,
        record?.libelle,
        record?.name,
        record?.titre,
        record?.site_web
      ]
        .map(normalizeMergeKey)
        .filter(Boolean);

      return staticKeys.some(
        (staticKey) => staticKey.includes(key) || key.includes(staticKey)
      );
    });

    if (found) {
      return found;
    }
  }

  return null;
}

function mergeParkingRecords(availabilityRecords, staticRecords) {
  const indexes = buildParkingStaticIndexes(staticRecords);

  return availabilityRecords.map((availabilityRecord) => {
    const staticRecord = findParkingStaticRecord(availabilityRecord, indexes);

    return {
      ...(staticRecord || {}),
      ...availabilityRecord
    };
  });
}

function logDebugIfEmpty(datasetKey, rawRecords, items) {
  if (items.length > 0 || rawRecords.length === 0) {
    return;
  }

  const firstRecord = rawRecords[0];

  console.log(`[DEBUG ${datasetKey}] normalizedCount=0`);
  console.log(`[DEBUG ${datasetKey}] first record keys:`, Object.keys(firstRecord || {}));
  console.log(`[DEBUG ${datasetKey}] first record:`);
  console.log(JSON.stringify(firstRecord, null, 2));
}

async function fetchAndNormalizeDataset(datasetKey) {
  const normalizer = datasetNormalizers[datasetKey];

  if (!normalizer) {
    const error = new Error(`Dataset non supporté : ${datasetKey}`);
    error.status = 404;
    error.code = 'UNKNOWN_DATASET';
    throw error;
  }

  const stateTrace = ['REQUEST_RECEIVED', 'FETCH_IN_PROGRESS'];

  if (datasetKey === 'parkings') {
    const [availabilityPayload, staticPayload] = await Promise.all([
      openDataDAO.fetchDataset('parkings'),
      openDataDAO.fetchDataset('parkingsStatic')
    ]);

    stateTrace.push('FETCH_COMPLETED');

    const availabilityRecords = extractRecords(availabilityPayload);
    const staticRecords = extractRecords(staticPayload);

    stateTrace.push('NORMALIZATION_IN_PROGRESS');

    const mergedRecords = mergeParkingRecords(availabilityRecords, staticRecords);

    const items = mergedRecords
      .map((record) => normalizer(record))
      .filter(Boolean);

    logDebugIfEmpty('parkings', mergedRecords, items);
    stateTrace.push('NORMALIZATION_COMPLETED');

    return {
      state: 'NORMALIZATION_COMPLETED',
      stateTrace,
      datasetKey,
      fetchedCount: availabilityRecords.length,
      normalizedCount: items.length,
      fetchedAt: new Date().toISOString(),
      items
    };
  }

  const payload = await openDataDAO.fetchDataset(datasetKey);
  stateTrace.push('FETCH_COMPLETED');

  const rawRecords = extractRecords(payload);
  stateTrace.push('NORMALIZATION_IN_PROGRESS');

  const items = rawRecords
    .map((record) => normalizer(record))
    .filter(Boolean);

  logDebugIfEmpty(datasetKey, rawRecords, items);
  stateTrace.push('NORMALIZATION_COMPLETED');

  return {
    state: 'NORMALIZATION_COMPLETED',
    stateTrace,
    datasetKey,
    fetchedCount: rawRecords.length,
    normalizedCount: items.length,
    fetchedAt: new Date().toISOString(),
    items
  };
}

module.exports = {
  fetchAndNormalizeDataset
};