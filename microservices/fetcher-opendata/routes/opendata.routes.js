const express = require('express');
const openDataController = require('../controllers/opendata.controller');

const router = express.Router();

// Une seule route interne, pas d'alias publics dataset par dataset, 
router.get('/fetch/:datasetKey', openDataController.fetchDataset);

module.exports = router;