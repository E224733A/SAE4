require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[Fetcher] Service démarré sur http://localhost:${PORT}`);
  console.log('[Fetcher] Health: GET /api/health');
  console.log('[Fetcher] Internal fetch: GET /internal/fetch/:datasetKey');
});