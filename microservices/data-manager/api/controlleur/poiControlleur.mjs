import poiDao from '../dao/poiDAO.mjs';
import cacheService from '../service/cacheService.mjs';
import { ALLOWED_TYPES, getTtlSeconds } from '../config/cacheConfig.mjs';

const poiController = {
  async savePOI(req, res, next) {
    try {
      const { type, data, items } = req.body;
      const payloadItems = Array.isArray(items) ? items : data;

      if (!type || !Array.isArray(payloadItems)) {
        return res.status(400).json({
          error: 'Format invalide. { type: "...", items: [...] } ou { type: "...", data: [...] } attendu.'
        });
      }

      if (!ALLOWED_TYPES.includes(type)) {
        return res.status(400).json({ error: `Type inconnu : ${type}` });
      }

      const fetchedAt = new Date();
      const expiresAt = new Date(fetchedAt.getTime() + getTtlSeconds(type) * 1000);

      const saved = await poiDao.upsertTypeData(type, payloadItems, {
        source: 'manual',
        fetchedAt,
        expiresAt
      });

      res.status(201).json({
        message: `${saved.itemCount} éléments de type '${type}' sauvegardés.`,
        type,
        itemCount: saved.itemCount,
        fetchedAt: saved.fetchedAt,
        expiresAt: saved.expiresAt
      });
    } catch (error) {
      next(error);
    }
  },

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

  async refreshPOI(req, res, next) {
    try {
      const rawTypes = Array.isArray(req.body?.types)
        ? req.body.types
        : req.body?.type
          ? [req.body.type]
          : [];

      if (rawTypes.length === 0) {
        return res.status(400).json({
          error: 'Au moins un type doit être fourni dans body.type ou body.types.'
        });
      }

      const uniqueTypes = [...new Set(rawTypes)];
      const results = [];

      for (const type of uniqueTypes) {
        const refresh = await cacheService.refreshType(type);
        results.push(refresh);
      }

      res.status(200).json({
        refreshedTypes: uniqueTypes,
        results
      });
    } catch (error) {
      next(error);
    }
  },

  async getCacheInfo(req, res, next) {
    try {
      const { type } = req.params;
      const result = await cacheService.ensureFreshType(type);
      res.status(200).json({
        type,
        state: result.state,
        cache: result.cache,
        itemCount: Array.isArray(result.items) ? result.items.length : 0
      });
    } catch (error) {
      next(error);
    }
  }
};

export default poiController;
