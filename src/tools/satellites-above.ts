import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AboveParams, N2YOApiClient, SatelliteAbove } from '../api-client.js';

export const getSatellitesAboveToolSchema = {
  name: 'get_satellites_above',
  description: 'Get satellites currently above a specified location',
  inputSchema: {
    type: 'object',
    properties: {
      observer_lat: {
        type: 'number',
        description: 'Observer latitude (-90 to 90)',
        minimum: -90,
        maximum: 90,
      },
      observer_lng: {
        type: 'number',
        description: 'Observer longitude (-180 to 180)',
        minimum: -180,
        maximum: 180,
      },
      observer_alt: {
        type: 'number',
        description: 'Observer altitude in meters (optional)',
        minimum: 0,
      },
      search_radius: {
        type: 'number',
        description: 'Search radius in degrees (0-90)',
        minimum: 0,
        maximum: 90,
      },
      category_id: {
        type: 'number',
        description: 'Category ID (0=all, 1=amateur, 2=cubesat, 3=education, 4=engineering, 5=galileo, 6=glo-ops, 7=gps-ops, 8=military, 9=radar, 10=resource, 11=sarsat, 12=science, 13=tdrss, 14=weather, 15=xm/sirius, 16=iridium-next, 17=globalstar, 18=intelsat, 19=ses, 20=telesat, 21=orbcomm, 22=gorizont, 23=raduga, 24=molniya, 25=dmc, 26=argos, 27=planet, 28=spire, 29=starlink, 30=oneweb)',
        minimum: 0,
        maximum: 30,
      },
    },
    required: ['observer_lat', 'observer_lng'],
  },
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

export async function getSatellitesAboveTool(
  apiClient: N2YOApiClient,
  args: {
    observer_lat: number;
    observer_lng: number;
    observer_alt?: number;
    search_radius?: number;
    category_id?: number;
  }
) {
  try {
    const { observer_lat, observer_lng, observer_alt, search_radius, category_id } = args;

    // Validate coordinates
    if (observer_lat < -90 || observer_lat > 90) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid latitude. Must be between -90 and 90.'
      );
    }

    if (observer_lng < -180 || observer_lng > 180) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid longitude. Must be between -180 and 180.'
      );
    }

    // Validate search_radius
    if (search_radius !== undefined && (search_radius < 0 || search_radius > 90)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid search_radius. Must be between 0 and 90 degrees.'
      );
    }

    // Validate category_id
    if (category_id !== undefined && (!Number.isInteger(category_id) || category_id < 0 || category_id > 30)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid category_id. Must be an integer between 0 and 30.'
      );
    }

    const params: AboveParams = {
      observer_lat,
      observer_lng,
      observer_alt,
      search_radius,
      category_id,
    };

    const satellites = await apiClient.getAbove(params);

    if (!satellites || satellites.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              observer: {
                latitude: observer_lat,
                longitude: observer_lng,
                altitude: observer_alt || 0,
              },
              search_radius: search_radius || 90,
              category: category_id !== undefined ? CATEGORY_MAPPING[category_id] || `Unknown (${category_id})` : 'All',
              satellites: [],
              count: 0,
              message: 'No satellites found above the specified location.',
            }, null, 2),
          },
        ],
      };
    }

    // Format the response
    const formattedSatellites = satellites.map(sat => formatSatelliteData(sat));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            observer: {
              latitude: observer_lat,
              longitude: observer_lng,
              altitude: observer_alt || 0,
            },
            search_radius: search_radius || 90,
            category: category_id !== undefined ? CATEGORY_MAPPING[category_id] || `Unknown (${category_id})` : 'All',
            satellites: formattedSatellites,
            count: formattedSatellites.length,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Error retrieving satellites above: ${(error as Error).message}`
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
