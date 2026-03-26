const axios = require('axios');

const DATA_MANAGER_URL = process.env.DATA_MANAGER_URL || 'http://localhost:3002';

const http = axios.create({
  baseURL: DATA_MANAGER_URL,
  timeout: 5000,
  proxy: false
});

function toServiceError(error) {
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    const mapped = new Error(`Le service data-manager est indisponible (${DATA_MANAGER_URL}).`);
    mapped.status = 503;
    mapped.code = 'DATA_MANAGER_UNAVAILABLE';
    return mapped;
  }

  if (error.response) {
    const mapped = new Error(`Le data-manager a renvoyé une erreur ${error.response.status}.`);
    mapped.status = 502;
    mapped.code = 'DATA_MANAGER_BAD_RESPONSE';
    return mapped;
  }

  return error;
}

async function fetchPoi(params = {}) {
  try {
    const response = await http.get('/api/db/poi', { params });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    throw toServiceError(error);
  }
}

const dataManagerDao = {
  async getPoiByType(type) {
    return fetchPoi({ type });
  },

  async getAllPoi() {
    return fetchPoi();
  }
};

module.exports = dataManagerDao;
