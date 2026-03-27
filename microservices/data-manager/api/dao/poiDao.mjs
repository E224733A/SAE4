import POICacheModel from '../model/poiModel.mjs';

const poiDao = {
  async findByType(type) {
    return POICacheModel.findOne({ type }).lean();
  },

  async findAll() {
    return POICacheModel.find({}).lean();
  },

  async upsertTypeData(type, items, metadata = {}) {
    return POICacheModel.findOneAndUpdate(
      { type },
      {
        type,
        items,
        itemCount: Array.isArray(items) ? items.length : 0,
        source: metadata.source || 'fetcher-opendata',
        fetchedAt: metadata.fetchedAt || new Date(),
        expiresAt: metadata.expiresAt || new Date()
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).lean();
  }
};

export default poiDao;
