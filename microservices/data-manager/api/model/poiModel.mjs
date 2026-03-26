import mongoose from 'mongoose';

const poiCacheSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, unique: true, index: true },
    items: { type: [mongoose.Schema.Types.Mixed], required: true, default: [] },
    source: { type: String, default: 'fetcher-opendata' },
    fetchedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    itemCount: { type: Number, required: true, default: 0 }
  },
  {
    versionKey: false
  }
);

const POICacheModel = mongoose.model('POICache', poiCacheSchema);

export default POICacheModel;
