require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
  console.log(`[Main] Brain démarré sur http://localhost:${PORT}`);
  console.log('[Main] Health: GET /api/health');
  console.log('[Main] Swagger: GET /api/docs');
  console.log('[Main] Plan: POST /api/itinerary/plan');
  console.log('[Main] Types: GET /api/poi/available-types');
});
