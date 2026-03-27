import cacheService from '../service/cacheService.mjs';

const poiController = {
  async getPOI(req, res, next) {
    try {
      const { type } = req.query;

      if (type) {
        const result = await cacheService.ensureFreshType(type);
        return res.status(200).json(result.items);
      }

      const allItems = await cacheService.getAllCachedPoi();
      return res.status(200).json(allItems);
    } catch (error) {
      next(error);
    }
  },

  async getCacheInfo(req, res, next) {
    try {
      const { type } = req.params;
      const result = await cacheService.inspectCache(type);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};

export default poiController;