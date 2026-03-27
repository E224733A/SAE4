const { fetchAndNormalizeDataset } = require('../services/fetchDataset.service');

const openDataController = {
  async fetchDataset(req, res, next) {
    try {
      const result = await fetchAndNormalizeDataset(req.params.datasetKey);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = openDataController;