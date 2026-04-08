import express from 'express';
import poiRoutes from './api/routes/poiRoute.mjs';

// Ce service gère le stockage et le cache des POI
const app = express();

app.use(express.json({ limit: '50mb' }));// Permet de lire du JSON dans les requêtes si besoin

app.get('/', (req, res) => {
  res.send('Data Manager opérationnel.');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ service: 'data-manager', status: 'ok' });// Route simple pour vérifier que le service répond
});

app.use('/api/db', poiRoutes);// Toutes les routes liées aux POI et au cache sont regroupées sous /api/db

export default app;