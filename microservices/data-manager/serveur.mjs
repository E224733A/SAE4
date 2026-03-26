import app from './app.mjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

const PORT = process.env.PORT || 3002;

const init = async () => {
    try {
        console.log('Démarrage du serveur MongoDB en mémoire, veuillez patienter...');
        
        // 1. Création et démarrage de l'instance MongoDB en mémoire
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        console.log(`[MongoDB] Serveur en mémoire démarré à l'adresse : ${mongoUri}`);

        // 2. Connexion de Mongoose à cette base de données éphémère
        await mongoose.connect(mongoUri);
        console.log('[Mongoose] Connecté avec succès à la base en mémoire.');

        // 3. Lancement du serveur Express
        app.listen(PORT, () => {
            console.log(`[Express] Data Manager tourne sur http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Erreur fatale lors du lancement :', error);
        process.exit(1); 
    }
};

init();
