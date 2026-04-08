curl.exe http://localhost:3002/api/db/cache/toilettes
curl.exe -X POST "http://localhost:3003/api/itinerary/plan" `
  -H "Content-Type: application/json" `
  -d '{\"start\":{\"lat\":47.2184,\"lon\":-1.5536},\"end\":{\"lat\":47.2065,\"lon\":-1.5632},\"poiTypes\":[\"toilettes\"],\"maxPoi\":2}'
curl.exe http://localhost:3002/api/db/cache/toilettes

curl.exe http://localhost:3002/api/db/cache/parkings
curl.exe -X POST "http://localhost:3003/api/itinerary/plan" `
  -H "Content-Type: application/json" `
  -d '{\"start\":{\"lat\":47.2184,\"lon\":-1.5536},\"end\":{\"lat\":47.2065,\"lon\":-1.5632},\"poiTypes\":[\"parkings\"],\"maxPoi\":2}'
curl.exe http://localhost:3002/api/db/cache/parkings

curl.exe http://localhost:3002/api/db/cache/composteurs
curl.exe -X POST "http://localhost:3003/api/itinerary/plan" `
  -H "Content-Type: application/json" `
  -d '{\"start\":{\"lat\":47.2184,\"lon\":-1.5536},\"end\":{\"lat\":47.2065,\"lon\":-1.5632},\"poiTypes\":[\"composteurs\"],\"maxPoi\":2}'
curl.exe http://localhost:3002/api/db/cache/composteurs

curl.exe -X POST "http://localhost:3003/api/itinerary/plan" `
  -H "Content-Type: application/json" `
  -d '{\"start\":{\"lat\":47.2184,\"lon\":-1.5536},\"end\":{\"lat\":47.2065,\"lon\":-1.5632},\"poiTypes\":[\"toilettes\",\"parkings\",\"composteurs\"],\"maxPoi\":4}'