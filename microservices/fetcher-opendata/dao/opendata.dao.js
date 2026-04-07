const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Valeur définissant le nombre de résultats à récupérer, configurable via la variable d'environnement FETCH_LIMIT
const DEFAULT_LIMIT = Number(process.env.FETCH_LIMIT || 100);

// Urls des datasets disponibles, associées à des clés plus simples pour les référencer dans le code
const DATASET_IDS = {
  toilettes: '244400404_toilettes-publiques-nantes-metropole',
  parkings: '244400404_parkings-publics-nantes-disponibilites',
  parkingsStatic: '244400404_parkings-publics-nantes',
  composteurs: '512042839_composteurs-quartier-nantes-metropole'
};

// Fonction utilitaire pour construire les options de fetch, pour pouvoir utiliser à l'IUT
function buildFetchOptions() {
  const proxy = process.env.https_proxy || process.env.HTTPS_PROXY;

  if (proxy) {
    return {
      agent: new HttpsProxyAgent(proxy)
    };
  }

  return {};
}

// Fonction pour récupérer les données depuis l'API de Nantes Métropole, en utilisant le datasetId correspondant et en appliquant la limite définie
async function fetchFromNantesAPI(datasetId, limit = DEFAULT_LIMIT) {
  const baseUrl = 'https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets';
  const url = `${baseUrl}/${datasetId}/records?limit=${limit}`;

  // Effectue la requête HTTP vers l'API de Nantes Métropole en utilisant fetch, avec les options de proxy si nécessaire
  const response = await fetch(url, buildFetchOptions());

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Erreur API Nantes: ${response.status} - ${body}`);
  }

  // Parse la réponse JSON et la retourne
  return response.json();
}

// Fonction principale pour récupérer les données d'un dataset spécifique en utilisant sa clé, et en appliquant la limite définie
// La différence avec fetchFromNantesAPI est que cette fonction utilise la clé du dataset pour trouver l'ID correspondant, ce qui permet de référencer les datasets de manière plus simple dans le code
async function fetchDataset(datasetKey, limit = DEFAULT_LIMIT) {
  const datasetId = DATASET_IDS[datasetKey];

  if (!datasetId) {
    throw new Error(`Dataset inconnu : ${datasetKey}`);
  }

  return fetchFromNantesAPI(datasetId, limit);
}

// Objet exporté qui regroupe les fonctions de récupération des données pour chaque dataset, ainsi que la liste des IDs de datasets disponibles. Cela permet d'avoir une interface centralisée pour accéder aux données opendata dans le reste du code, en utilisant des fonctions spécifiques pour chaque type de données (toilettes, parkings, composteurs) qui appellent la fonction générique fetchDataset avec la clé correspondante.
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