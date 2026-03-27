import axios from 'axios';

const FETCHER_URL = process.env.FETCHER_URL || 'http://localhost:3001';

const http = axios.create({
  baseURL: FETCHER_URL,
  timeout: 10000,
  proxy: false
});

function toFetcherError(error) {
  if (
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    error.code === 'ETIMEDOUT'
  ) {
    const mapped = new Error(`Le fetcher-opendata est indisponible (${FETCHER_URL}).`);
    mapped.status = 503;
    mapped.code = 'FETCHER_UNAVAILABLE';
    return mapped;
  }

  if (error.response) {
    const mapped = new Error(
      `Le fetcher-opendata a renvoyé une erreur ${error.response.status}.`
    );
    mapped.status = 502;
    mapped.code = 'FETCHER_BAD_RESPONSE';
    return mapped;
  }

  return error;
}

const fetcherDao = {
  async fetchDataset(type) {
    try {
      const response = await http.get(`/internal/fetch/${type}`);
      return response.data;
    } catch (error) {
      throw toFetcherError(error);
    }
  }
};

export default fetcherDao;