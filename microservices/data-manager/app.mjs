import express from 'express';
import poiRoutes from './api/route/poiRoute.mjs';

const app = express();

// Middleware pour parser les requêtes JSON (crucial pour recevoir les données du fetcher)
app.use(express.json({ limit: '50mb' })); // Limite augmentée car les données OpenData peuvent être lourdes

app.get('/', (req, res) => {
    res.send('Data Manager est opérationnel (Connecté à MongoDB en mémoire) !');
});

// Branchement des routes
app.use('/api/db', poiRoutes);

export default app;
