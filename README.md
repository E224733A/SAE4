# Nantes App — Architecture microservices OpenData

## 1. Présentation du projet

Ce projet a pour objectif de faire communiquer plusieurs **microservices REST** dans le cadre de la SAE, sans partie Android, autour d'un cas concret de **navigation urbaine à Nantes** fondée sur des jeux de données OpenData.

L'idée générale est de construire une application capable de :

- interroger plusieurs sources OpenData de la métropole nantaise ;
- transformer ces données dans un format commun ;
- les stocker temporairement dans un service pivot ;
- les réutiliser pour répondre à une requête métier ;
- produire une réponse JSON exploitable par un client.

Le scénario métier principal est le suivant :

- l'utilisateur fournit un **point de départ** et un **point d'arrivée** ;
- il choisit un ou plusieurs types de **points d'intérêt (POI)** ;
- l'application récupère les POI disponibles ;
- elle sélectionne les plus pertinents ;
- elle renvoie un **trajet JSON** reliant départ, POI retenus et arrivée.

Le projet met donc l'accent sur la **communication entre API REST**, la séparation des responsabilités et la structuration en couches.

---

## 2. Idée retenue

L'application vise à exploiter des données utiles à l'échelle de la ville de Nantes, par exemple :

- toilettes publiques ;
- parkings publics ;
- composteurs de quartier ;
- et, à terme, d'autres données comme les jours de collecte, les limitations de vitesse, les bacs de tri, les vélos en libre-service, etc.

La version actuelle validée techniquement repose sur trois jeux de données :

- **toilettes publiques** ;
- **parkings publics** ;
- **composteurs de quartier**.

---

## 3. Architecture globale du système

L'application est organisée en trois couches principales :

1. **Collecte** — `fetcher-opendata`
2. **Persistance / cache** — `data-manager`
3. **Intelligence métier / agrégation** — `main` (brain)

Le flux métier principal visé est :

```text
Client → brain → data-manager → fetcher-opendata → OpenData Nantes
```

Cette architecture répond à une règle importante du projet :

- le **fetcher** connaît la source et transforme ;
- le **data-manager** stocke et décide s'il faut rafraîchir ;
- le **brain** applique la logique métier.

Autrement dit :

- **normalisation source** → fetcher
- **stockage/cache** → data-manager
- **agrégation métier** → brain

---

## 4. Rôle exact de chaque microservice

### 4.1 `fetcher-opendata`

Le microservice `fetcher-opendata` est un service de **collecte spécialisé**.

Il doit :

- connaître les jeux de données OpenData Nantes ;
- appeler les sources externes ;
- récupérer les enregistrements bruts ;
- appliquer une **normalisation dataset par dataset** ;
- renvoyer une liste de POI déjà homogènes ;
- ne **rien sauvegarder**.

Ce service ne doit pas être présenté comme le point d'entrée principal de l'application. Il s'agit d'un service interne de collecte.

### 4.2 `data-manager`

Le microservice `data-manager` est le **pivot central** du système.

Il doit :

- stocker les données en base ;
- gérer un cache avec expiration ;
- répondre aux demandes du `brain` ;
- appeler le `fetcher-opendata` si les données sont absentes ou expirées ;
- remplacer le cache après rafraîchissement ;
- renvoyer les données au `brain` **sans transformation métier**.

Règle d'architecture importante :

> le `data-manager` ne doit rien transformer

Cela permet de bien distinguer :

- l'adaptation de source dans le fetcher ;
- le stockage et la fraîcheur dans le data-manager.

### 4.3 `main` / `brain`

Le microservice `main` porte la **logique métier**.

Il doit :

- recevoir la requête utilisateur ;
- valider les entrées ;
- demander les données au `data-manager` ;
- agréger les POI demandés ;
- classer ou sélectionner les POI ;
- construire un trajet ;
- renvoyer une réponse JSON finale.

Le `brain` ne doit plus deviner la structure des datasets bruts. Il doit supposer que les POI reçus sont déjà au bon format.

---

## 5. Contrat canonique POI

Pour que les trois microservices puissent coopérer proprement, tous les datasets sont convertis dans un **format canonique commun** avant stockage.

Format minimal retenu :

```json
{
  "type": "toilettes",
  "sourceDataset": "toilettes",
  "sourceId": "abc123",
  "name": "Toilettes Place Royale",
  "lat": 47.213,
  "lon": -1.556,
  "address": "Place Royale",
  "city": "Nantes",
  "postcode": "44000",
  "accessibility": "PMR",
  "openingHours": "24h/24",
  "extra": {}
}
```

### Champs obligatoires

- `type`
- `sourceDataset`
- `sourceId`
- `name`
- `lat`
- `lon`

### Champs facultatifs

- `address`
- `city`
- `postcode`
- `accessibility`
- `openingHours`
- `extra`

### Règles associées

- le **fetcher** renvoie toujours une liste d'objets dans ce format ;
- le **data-manager** stocke ce format tel quel ;
- le **brain** lit ce format sans renormalisation ;
- un POI sans coordonnées exploitables n'est pas conservé.

---

## 6. Jeux de données gérés

### Toilettes publiques

Dataset exploité et validé de bout en bout.

### Parkings publics

Le traitement des parkings repose sur deux sources :

- un dataset de **disponibilités temps réel** ;
- un dataset **statique** contenant géolocalisation et informations descriptives.

La normalisation des parkings nécessite donc une **fusion** entre les deux sources.

État actuel :

- le flux fonctionne ;
- la majorité des parkings est normalisée ;
- quelques parkings peuvent encore ne pas être fusionnés automatiquement si les noms diffèrent trop entre le dataset temps réel et le dataset statique.

### Composteurs de quartier

Dataset exploité et validé de bout en bout.

---

## 7. Organisation logique des automates

Le projet peut être présenté à l'aide de trois automates, chacun placé dans la bonne couche.

### 7.1 Automate de normalisation — fetcher

États principaux :

- `REQUEST_RECEIVED`
- `FETCH_IN_PROGRESS`
- `FETCH_COMPLETED`
- `NORMALIZATION_IN_PROGRESS`
- `NORMALIZATION_COMPLETED`
- `FETCH_FAILED`
- `NORMALIZATION_FAILED`

### 7.2 Automate de cache / synchronisation — data-manager

États principaux :

- `READ_REQUESTED`
- `CACHE_HIT`
- `CACHE_MISS`
- `CACHE_EXPIRED`
- `FETCHER_REQUESTED`
- `CACHE_UPDATED`
- `RESPONSE_READY`
- `REFRESH_FAILED`

### 7.3 Automate d'agrégation — brain

États principaux :

- `QUERY_RECEIVED`
- `QUERY_VALIDATED`
- `DATA_REQUESTED`
- `DATA_RECEIVED`
- `POI_AGGREGATED`
- `POI_SELECTED`
- `ROUTE_BUILT`
- `RESPONSE_READY`

---

## 8. Arborescence générale du projet

```text
.
├── microservices/
│   ├── fetcher-opendata/
│   ├── data-manager/
│   └── main/
└── README.md
```

### `microservices/fetcher-opendata`

Contient notamment :

- le point d'entrée du service ;
- les routes du fetcher ;
- la DAO d'appel OpenData ;
- le service de récupération/normalisation ;
- les normalizers spécialisés par dataset.

### `microservices/data-manager`

Contient notamment :

- le serveur Express du service de persistance ;
- la connexion / DAO vers Mongo ;
- la logique de cache et de rafraîchissement ;
- les routes `/api/db/...`.

### `microservices/main`

Contient notamment :

- le contrôleur métier ;
- les validateurs de requêtes ;
- le service d'agrégation ;
- le routage ;
- la documentation Swagger.

---

## 9. Démarrage du projet

Ouvrir **trois terminaux** distincts.

### 9.1 Lancer le `data-manager`

```bash
cd microservices/data-manager
npm install
npm run dev
```

### 9.2 Lancer le `fetcher-opendata`

```bash
cd microservices/fetcher-opendata
npm install
npm run dev
```

### 9.3 Lancer le `brain`

```bash
cd microservices/main
npm install
npm run dev
```

---

## 10. Ports par défaut

- `fetcher-opendata` : `3001`
- `data-manager` : `3002`
- `main` : `3003`


## 11. Routes principales

### 11.1 Brain (`main`)

Routes publiques principales :

- `GET /api/health`
- `GET /api/poi/available-types`
- `POST /api/itinerary/debug`
- `POST /api/itinerary/plan`
- `GET /api/docs`

### 11.2 Data-manager

Routes publiques du pivot :

- `GET /api/db/poi?type=...`
- `GET /api/db/cache/:type`

Le `data-manager` est le point d'accès aux POI pour le `brain`.
Il décide lui-même s'il doit servir le cache ou déclencher un rafraîchissement interne.

### 11.3 Fetcher-opendata

Route technique interne :

- `GET /internal/fetch/:datasetKey`

Cette route n'est pas une route métier publique.
Le flux normal reste :

`Client → brain → data-manager → fetcher-opendata → OpenData Nantes`


## 12. Exemples de tests

### 12.1 Types disponibles

```bash
curl -s http://localhost:3003/api/poi/available-types
```

### 12.2 Itinéraire avec toilettes

```bash
curl -s -X POST http://localhost:3003/api/itinerary/plan \
  -H "Content-Type: application/json" \
  -d '{
    "start": { "lat": 47.2184, "lon": -1.5536 },
    "end": { "lat": 47.2065, "lon": -1.5632 },
    "poiTypes": ["toilettes"],
    "maxPoi": 2
  }'
```

### 12.3 Itinéraire avec parkings

```bash
curl -s -X POST http://localhost:3003/api/itinerary/plan \
  -H "Content-Type: application/json" \
  -d '{
    "start": { "lat": 47.2184, "lon": -1.5536 },
    "end": { "lat": 47.2065, "lon": -1.5632 },
    "poiTypes": ["parkings"],
    "maxPoi": 2
  }'
```

### 12.4 Itinéraire avec composteurs

```bash
curl -s -X POST http://localhost:3003/api/itinerary/plan \
  -H "Content-Type: application/json" \
  -d '{
    "start": { "lat": 47.2184, "lon": -1.5536 },
    "end": { "lat": 47.2065, "lon": -1.5632 },
    "poiTypes": ["composteurs"],
    "maxPoi": 2
  }'
```

---

## 13. État d'avancement validé

### Validé techniquement

- flux complet `toilettes` ;
- flux complet `composteurs` ;
- flux fonctionnel `parkings` avec fusion partielle temps réel + statique ;
- cache actif côté `data-manager` ;
- agrégation et plan JSON côté `brain`.

### Points encore améliorable

- fiabiliser à 100 % le matching des parkings ;
- enrichir Swagger ;
- compléter les tests unitaires ;
- améliorer la documentation de déploiement ;
- ajouter d'autres datasets OpenData à terme.

## 14. Ce qu'il ne faut plus faire

Pour rester cohérent avec l'architecture retenue :

- ne pas présenter le fetcher comme point d'entrée principal ;
- ne pas laisser `main` interpréter des structures OpenData brutes ;
- ne pas mettre de logique métier dans le `data-manager` ;
- ne jamais sauvegarder dans `fetcher-opendata`.

## 15. Conclusion

Cette version du projet montre une architecture microservices cohérente avec l'objectif de la SAE :

- **un service de collecte** spécialisé ;
- **un service de persistance / cache** central ;
- **un service d'intelligence métier** chargé de la requête utilisateur.

Le projet illustre ainsi une communication REST entre services, une séparation des responsabilités et une structuration plus robuste qu'un modèle où le fetcher serait directement exposé comme service principal.
