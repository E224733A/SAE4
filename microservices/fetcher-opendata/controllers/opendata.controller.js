const { fetchAndNormalizeDataset } = require('../services/fetchDataset.service');

/**
 * Controleur principal pour gérer les requêtes liées aux données opendata.
 * Il reçoit les requêtes, appelle le service de récupération et de normalisation des données, 
 * et renvoie les résultats au client.
 * En cas d'erreur, il passe l'erreur au middleware de gestion des erreurs.
 */
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