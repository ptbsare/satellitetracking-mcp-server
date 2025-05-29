import { SatelliteAbove } from '../api-client.js'; // Adjust path if necessary

export const CATEGORY_MAPPING: Record<number, string> = {
  0: 'All',
  1: 'Amateur',
  2: 'CubeSat',
  3: 'Education',
  4: 'Engineering',
  5: 'Galileo',
  6: 'GLO-OPS',
  7: 'GPS-OPS',
  8: 'Military',
  9: 'Radar',
  10: 'Resource',
  11: 'SARSAT',
  12: 'Science',
  13: 'TDRSS',
  14: 'Weather',
  15: 'XM/Sirius',
  16: 'Iridium-NEXT',
  17: 'Globalstar',
  18: 'Intelsat',
  19: 'SES',
  20: 'Telesat',
  21: 'Orbcomm',
  22: 'Gorizont',
  23: 'Raduga',
  24: 'Molniya',
  25: 'DMC',
  26: 'Argos',
  27: 'Planet',
  28: 'Spire',
  29: 'Starlink',
  30: 'OneWeb',
};

export function formatSatelliteData(satellite: SatelliteAbove) { // Ensure SatelliteAbove is imported and used
  return {
    norad_id: satellite.satid,
    name: satellite.satname,
    international_designator: satellite.intDesignator,
    launch_date: satellite.launchDate,
    position: { // This position block might not be available from searchSatellites, adjust if necessary
      latitude: satellite.satlat,
      longitude: satellite.satlng,
      altitude: satellite.satalt,
    },
  };
}
