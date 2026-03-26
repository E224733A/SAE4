export const ALLOWED_TYPES = ['toilettes', 'parkings', 'composteurs'];

export function getTtlSeconds(type) {
  const defaults = {
    toilettes: Number(process.env.TOILETTES_TTL_SECONDS || 86400),
    composteurs: Number(process.env.COMPOSTEURS_TTL_SECONDS || 86400),
    parkings: Number(process.env.PARKINGS_TTL_SECONDS || 300)
  };

  return defaults[type] || 3600;
}
