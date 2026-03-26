const { fetchAndNormalizeDataset } = require('../services/fetchDataset.service');

async function sendDataset(datasetKey, res, next) {
  try {
    const result = await fetchAndNormalizeDataset(datasetKey);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

const openDataController = {
  fetchDataset: async (req, res, next) => {
    await sendDataset(req.params.datasetKey, res, next);
  },

  getToilettes: async (req, res, next) => {
    await sendDataset('toilettes', res, next);
  },

  getParkings: async (req, res, next) => {
    await sendDataset('parkings', res, next);
  },

  getComposteurs: async (req, res, next) => {
    await sendDataset('composteurs', res, next);
  }
};

module.exports = openDataController;
