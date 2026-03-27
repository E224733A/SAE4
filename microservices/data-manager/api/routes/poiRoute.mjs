import express from 'express';
import poiController from '../controller/poiController.mjs';

const router = express.Router();

router.get('/poi', poiController.getPOI);
router.get('/cache/:type', poiController.getCacheInfo);

export default router;