import express from 'express';
import poiRoutes from './api/routes/poiRoute.mjs';

const app = express();

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
  res.send('Data Manager opérationnel.');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ service: 'data-manager', status: 'ok' });
});

app.use('/api/db', poiRoutes);

export default app;