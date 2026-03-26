# microservices/main

Microservice brain / agrégateur métier.

## Rôle

- reçoit une requête utilisateur avec un départ, une arrivée et des types de POI ;
- interroge le `data-manager` ;
- classe les POI les plus pertinents ;
- construit un trajet simplifié.

Le `brain` ne parle pas directement à OpenData Nantes et ne normalise plus les données brutes d'un dataset.
