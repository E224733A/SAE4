const express = require('express');
const openDataRoutes = require('./routes/opendata.routes');

// Ce service sert uniquement à récupérer et normaliser les données OpenData
const app = express();


app.use(express.json({ limit: '10mb' }));// Permet de lire les corps JSON des requêtes entrantes


app.get('/', (req, res) => {
  res.send('Le service fetcher-opendata est opérationnel.');
});


app.get('/api/health', (req, res) => {// Route simple pour vérifier manuellement que le service est démarré
  res.status(200).json({ service: 'fetcher-opendata', status: 'ok' });
});

// Les routes du fetcher sont internes : le client ne doit pas appeler ce service directement
app.use('/internal', openDataRoutes);

// Si aucune route ne correspond, on renvoie une erreur 404 claire
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});
// Middleware global de gestion d'erreur : transforme une exception en réponse JSON exploitable
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