const openDataDAO = require('../dao/opendata.dao');
const { extractRecords } = require('./normalizers/common');
const { datasetNormalizers } = require('./normalizers');


// Normalise une valeur pour la faire correspondre entre les datasets de parkings statiques et dynamiques, en supprimant les accents, les espaces, les caractères spéciaux, et en mettant tout en minuscules. Cela permet de faire le lien entre les deux datasets même si les noms ne sont pas exactement identiques.
function normalizeMergeKey(value) {
  if (value === undefined || value === null) {
    return null;
  }

  // Supprime les accents, les espaces, les caractères spéciaux, et met en minuscules
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

// Construit des index pour les données statiques des parkings, en créant des maps pour accéder rapidement aux enregistrements par ID ou par nom, ainsi qu'une liste de tous les enregistrements. Cela permet de faire le lien entre les données de disponibilité et les données statiques lors de la fusion des deux datasets.
function buildParkingStaticIndexes(staticRecords) {
  const byId = new Map();
  const byName = new Map();
  const all = [];

  // Parcourt tous les enregistrements statiques, les ajoute à la liste complète, et les indexe par ID et par nom en utilisant les fonctions de normalisation pour permettre de faire le lien avec les données de disponibilité même si les identifiants ou les noms ne sont pas exactement identiques.
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


// Trouve l'enregistrement statique correspondant à un enregistrement de disponibilité de parking, en utilisant les index construits précédemment pour faire le lien entre les deux datasets.
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

  // Tente d'abord de trouver une correspondance par ID, puis par nom, en utilisant les fonctions de normalisation pour permettre de faire le lien même si les identifiants ou les noms ne sont pas exactement identiques. Si aucune correspondance n'est trouvée, retourne null.
  for (const value of idCandidates) {
    const key = normalizeMergeKey(value);
    if (key && byId.has(key)) {
      return byId.get(key);
    }
  }

  // Si aucune correspondance par ID n'est trouvée, tente de trouver une correspondance par nom
  for (const value of nameCandidates) {
    const key = normalizeMergeKey(value);
    if (key && byName.has(key)) {
      return byName.get(key);
    }
  }

  // Si aucune correspondance par ID ou par nom n'est trouvée, tente une recherche plus large dans tous les enregistrements statiques, en vérifiant si l'un des champs de nom contient ou est contenu dans le nom de l'enregistrement de disponibilité, pour essayer de faire le lien même si les noms ne sont pas exactement identiques.
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

// Fusionne les enregistrements de disponibilité des parkings avec les enregistrements statiques correspondants, en utilisant les fonctions précédentes pour faire le lien entre les deux datasets. 
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

// Fonction utilitaire pour logger des informations de debug lorsque le processus de normalisation d'un dataset ne retourne aucun item,.
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

// Fonction principale pour récupérer les données d'un dataset spécifique en utilisant sa clé, et en appliquant la limite définie.
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