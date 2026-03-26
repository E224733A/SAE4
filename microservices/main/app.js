const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./docs/swagger');
const brainRoutes = require('./routes/brain.routes');

const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('Le microservice main / brain est opérationnel.');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ service: 'main-brain', status: 'ok' });
});

app.use('/api', brainRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Erreur interne du serveur.';
  console.error('[Main][Error]', { status, code, message, path: req.originalUrl, method: req.method });

  if (res.headersSent) {
    return next(err);
  }

  res.status(status).json({ error: message, code });
});

module.exports = app;
