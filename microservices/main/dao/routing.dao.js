const routingDao = {
  async buildRoute(segments) {
    return {
      provider: process.env.ROUTING_PROVIDER || 'internal',
      mode: 'mvp-direct',
      segments,
      note: 'Trajet simplifié : aucune API externe de routing utilisée pour le moment.'
    };
  }
};

module.exports = routingDao;
