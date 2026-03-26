const express = require('express');
const openDataController = require('../controllers/opendata.controller');

const router = express.Router();

router.get('/fetch/:datasetKey', openDataController.fetchDataset);

// Alias de compatibilité
router.get('/toilettes', openDataController.getToilettes);
router.get('/parkings', openDataController.getParkings);
router.get('/composteurs', openDataController.getComposteurs);

module.exports = router;
