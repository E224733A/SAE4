import express from 'express';
import poiController from '../controlleur/poiControlleur.mjs';

const router = express.Router();

router.post('/poi', poiController.savePOI);
router.get('/poi', poiController.getPOI);
router.post('/refresh', poiController.refreshPOI);
router.get('/cache/:type', poiController.getCacheInfo);

export default router;
