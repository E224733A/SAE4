#!/bin/bash

trap 'kill $P1 $P2 $P3 2>/dev/null; exit' SIGINT

echo "Démarrage des microservices"

(cd microservices/data-manager && npm i && npm run dev) & P1=$!
(cd microservices/fetcher-opendata && npm i && npm run dev) & P2=$!
(cd microservices/main && npm i && npm run dev) & P3=$!

wait
