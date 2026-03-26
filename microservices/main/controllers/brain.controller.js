const brainService = require('../services/brain.service');
const { validatePlanRequest } = require('../validators/plan.validator');

const brainController = {
  getAvailableTypes(req, res) {
    res.status(200).json({ types: brainService.getAvailableTypes() });
  },

  async planItinerary(req, res, next) {
    try {
      const validation = validatePlanRequest(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Requête invalide.',
          details: validation.errors
        });
      }

      const result = await brainService.buildPlan(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async debugPlan(req, res, next) {
    try {
      const validation = validatePlanRequest(req.body);

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Requête invalide.',
          details: validation.errors
        });
      }

      const result = await brainService.debugPlan(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = brainController;
