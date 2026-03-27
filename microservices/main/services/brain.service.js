const dataManagerDao = require('../dao/dataManager.dao');
const routingDao = require('../dao/routing.dao');
const { rankPoisBetweenPoints } = require('../utils/distance');

const AVAILABLE_TYPES = ['toilettes', 'parkings', 'composteurs'];

function normalizeRequestedTypes(poiTypes) {
  if (!Array.isArray(poiTypes) || poiTypes.length === 0) {
    return [];
  }

  return [...new Set(poiTypes.filter((type) => AVAILABLE_TYPES.includes(type)))];
}

function uniquePois(pois) {
  const seen = new Set();

  return pois.filter((poi) => {
    const key = poi.sourceId
      ? `${poi.type}:${poi.sourceId}`
      : `${poi.type}:${poi.lat}:${poi.lon}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createSegments(start, orderedPois, end) {
  const points = [start, ...orderedPois.map((poi) => ({ lat: poi.lat, lon: poi.lon })), end];
  const segments = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    segments.push({
      from: points[index],
      to: points[index + 1]
    });
  }

  return segments;
}

async function fetchByType(type) {
  const items = await dataManagerDao.getPoiByType(type);

  return {
    type,
    items: Array.isArray(items) ? items.filter(Boolean) : []
  };
}

const brainService = {
  getAvailableTypes() {
    return AVAILABLE_TYPES;
  },

  async buildPlan(payload) {
    const start = payload.start;
    const end = payload.end;
    const poiTypes = normalizeRequestedTypes(payload.poiTypes);
    const maxPoi = Number.isInteger(payload.maxPoi)
      ? payload.maxPoi
      : Number(process.env.MAX_DEFAULT_POI || 3);

    const stateTrace = ['QUERY_RECEIVED', 'QUERY_VALIDATED'];

    let groupedResults = [];

    if (poiTypes.length > 0) {
      stateTrace.push('DATA_REQUESTED');
      groupedResults = await Promise.all(poiTypes.map((type) => fetchByType(type)));
      stateTrace.push('DATA_RECEIVED');
    }

    const availablePoi = uniquePois(groupedResults.flatMap((group) => group.items));
    stateTrace.push('POI_AGGREGATED');

    const rankedPois = rankPoisBetweenPoints(start, end, availablePoi).slice(0, Math.max(0, maxPoi));
    stateTrace.push('POI_SELECTED');

    const routeSegments = createSegments(start, rankedPois, end);
    const route = await routingDao.buildRoute(routeSegments);

    stateTrace.push('ROUTE_BUILT');
    stateTrace.push('RESPONSE_READY');

    return {
      state: 'RESPONSE_READY',
      stateTrace,
      request: {
        start,
        end,
        poiTypes,
        maxPoi
      },
      summary: {
        requestedTypeCount: poiTypes.length,
        availablePoiCount: availablePoi.length,
        selectedPoiCount: rankedPois.length,
        routingProvider: route.provider
      },
      selectedPoi: rankedPois,
      route
    };
  },

  async debugPlan(payload) {
    const start = payload.start;
    const end = payload.end;
    const poiTypes = normalizeRequestedTypes(payload.poiTypes);
    const maxPoi = Number.isInteger(payload.maxPoi)
      ? payload.maxPoi
      : Number(process.env.MAX_DEFAULT_POI || 3);

    const fetchedByType = {};
    const groupedResults = await Promise.all(poiTypes.map((type) => fetchByType(type)));

    for (const group of groupedResults) {
      fetchedByType[group.type] = group.items.length;
    }

    const merged = uniquePois(groupedResults.flatMap((group) => group.items));
    const ranked = rankPoisBetweenPoints(start, end, merged).slice(0, Math.max(0, maxPoi));

    return {
      request: {
        start,
        end,
        poiTypes,
        maxPoi
      },
      fetchedByType,
      totalAvailable: merged.length,
      normalizedPreview: ranked
    };
  }
};

module.exports = brainService;
