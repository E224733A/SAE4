import express from 'express';
import poiController from '../controlleur/poiControlleur.mjs';

const router = express.Router();

// Route métier publique utilisée par le brain
router.get('/poi', poiController.getPOI);

// Route de debug/inspection en lecture seule
router.get('/cache/:type', poiController.getCacheInfo);

export default router;