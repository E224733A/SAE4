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

// Route interne uniquement
app.use('/internal', openDataRoutes);

// Middleware pour gérer les routes non trouvées
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});
// Middleware de gestion des erreurs global, pour capturer toutes les erreurs non gérées dans les routes et les services, et renvoyer une réponse d'erreur structurée au client, tout en loggant l'erreur pour faciliter le debug.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'FETCHER_INTERNAL_ERROR';
  const message = err.message || 'Erreur interne du fetcher.';

  console.error('[Fetcher][Error]', {
    status,
    code,
    message,
    path: req.originalUrl,
    method: req.method
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({ error: message, code });
});

module.exports = app;