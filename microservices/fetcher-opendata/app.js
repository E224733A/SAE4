const express = require('express');
const openDataRoutes = require('./routes/opendata.routes');

const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('Le service fetcher-opendata est opérationnel.');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ service: 'fetcher-opendata', status: 'ok' });
});

app.use('/api', openDataRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'FETCHER_INTERNAL_ERROR';
  const message = err.message || 'Erreur interne du fetcher.';
  console.error('[Fetcher][Error]', { status, code, message, path: req.originalUrl, method: req.method });

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({ error: message, code });
});

module.exports = app;
