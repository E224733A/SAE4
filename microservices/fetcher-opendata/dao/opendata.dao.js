const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const DEFAULT_LIMIT = Number(process.env.FETCH_LIMIT || 100);

const DATASET_IDS = {
  toilettes: '244400404_toilettes-publiques-nantes-metropole',
  parkings: '244400404_parkings-publics-nantes-disponibilites',
  parkingsStatic: '244400404_parkings-publics-nantes',
  composteurs: '512042839_composteurs-quartier-nantes-metropole'
};

function buildFetchOptions() {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;

  if (proxy) {
    return {
      agent: new HttpsProxyAgent(proxy)
    };
  }

  return {};
}

async function fetchFromNantesAPI(datasetId, limit = DEFAULT_LIMIT) {
  const baseUrl = 'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets';
  const url = `${baseUrl}/${datasetId}/records?limit=${limit}`;

  const response = await fetch(url, buildFetchOptions());

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erreur API Nantes: ${response.status} - ${body}`);
  }

  return response.json();
}

async function fetchDataset(datasetKey, limit = DEFAULT_LIMIT) {
  const datasetId = DATASET_IDS[datasetKey];

  if (!datasetId) {
    throw new Error(`Dataset inconnu : ${datasetKey}`);
  }

  return fetchFromNantesAPI(datasetId, limit);
}

const openDataDAO = {
  DATASET_IDS,
  fetchDataset,

  async getToilettes() {
    return fetchDataset('toilettes');
  },

  async getParkings() {
    return fetchDataset('parkings');
  },

  async getParkingsStatic() {
    return fetchDataset('parkingsStatic');
  },

  async getComposteurs() {
    return fetchDataset('composteurs');
  }
};

module.exports = openDataDAO;