import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient, SatelliteAbove } from '../api-client.js';

export const satellitesCategoryResourceTemplate = {
  uriTemplate: 'satellites://category/{category_id}',
  name: 'Satellites by Category',
  description: 'List of satellites in a specific category',
  mimeType: 'application/json',
};

// Satellite category mapping
const CATEGORY_MAPPING: Record<number, string> = {
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

export async function getSatellitesCategoryResource(
  apiClient: N2YOApiClient,
  uri: string
): Promise<string> {
  try {
    // Extract the category ID from the URI
    const match = uri.match(/^satellites:\/\/category\/(\d+)$/);
    if (!match) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid satellites category resource URI: ${uri}`
      );
    }

    const categoryId = parseInt(match[1], 10);

    // Validate category ID
    if (!Number.isInteger(categoryId) || categoryId < 0 || categoryId > 30) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid category ID. Must be an integer between 0 and 30.'
      );
    }

    // Use a default location (equator) and large search radius to get satellites
    const params = {
      observer_lat: 0,
      observer_lng: 0,
      search_radius: 90,
      category_id: categoryId,
    };

    const satellites = await apiClient.getAbove(params);

    if (!satellites || satellites.length === 0) {
      return JSON.stringify({
        category_id: categoryId,
        category_name: CATEGORY_MAPPING[categoryId] || `Unknown (${categoryId})`,
        satellites: [],
        count: 0,
        message: `No satellites found in category: ${CATEGORY_MAPPING[categoryId] || categoryId}`,
        timestamp: new Date().toISOString(),
      }, null, 2);
    }

    // Format the response
    const formattedSatellites = satellites.map(sat => formatSatelliteData(sat));

    return JSON.stringify({
      category_id: categoryId,
      category_name: CATEGORY_MAPPING[categoryId] || `Unknown (${categoryId})`,
      satellites: formattedSatellites,
      count: formattedSatellites.length,
      timestamp: new Date().toISOString(),
    }, null, 2);
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Error retrieving satellites by category: ${(error as Error).message}`
    );
  }
}

function formatSatelliteData(satellite: SatelliteAbove) {
  return {
    norad_id: satellite.satid,
    name: satellite.satname,
    international_designator: satellite.intDesignator,
    launch_date: satellite.launchDate,
    position: {
      latitude: satellite.satlat,
      longitude: satellite.satlng,
      altitude: satellite.satalt,
    },
  };
}
