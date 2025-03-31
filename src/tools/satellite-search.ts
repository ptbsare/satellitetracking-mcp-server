import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient, SatelliteAbove } from '../api-client.js';

export const searchSatellitesToolSchema = {
  name: 'search_satellites',
  description: 'Search for satellites by name or category',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for satellite name',
      },
      category_id: {
        type: 'number',
        description: 'Category ID (0=all, 1=amateur, 2=cubesat, 3=education, 4=engineering, 5=galileo, 6=glo-ops, 7=gps-ops, 8=military, 9=radar, 10=resource, 11=sarsat, 12=science, 13=tdrss, 14=weather, 15=xm/sirius, 16=iridium-next, 17=globalstar, 18=intelsat, 19=ses, 20=telesat, 21=orbcomm, 22=gorizont, 23=raduga, 24=molniya, 25=dmc, 26=argos, 27=planet, 28=spire, 29=starlink, 30=oneweb)',
        minimum: 0,
        maximum: 30,
      },
    },
    oneOf: [
      { required: ['query'] },
      { required: ['category_id'] },
    ],
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

export async function searchSatellitesTool(
  apiClient: N2YOApiClient,
  args: {
    query?: string;
    category_id?: number;
  }
) {
  try {
    const { query, category_id } = args;

    // Validate that at least one parameter is provided
    if (!query && category_id === undefined) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Either query or category_id must be provided.'
      );
    }

    // Validate category_id
    if (category_id !== undefined && (!Number.isInteger(category_id) || category_id < 0 || category_id > 30)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid category_id. Must be an integer between 0 and 30.'
      );
    }

    // Search for satellites
    const satellites = await apiClient.searchSatellites(query || '', category_id);

    if (!satellites || satellites.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: query || null,
              category: category_id !== undefined ? CATEGORY_MAPPING[category_id] || `Unknown (${category_id})` : null,
              satellites: [],
              count: 0,
              message: 'No satellites found matching the search criteria.',
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
            query: query || null,
            category: category_id !== undefined ? CATEGORY_MAPPING[category_id] || `Unknown (${category_id})` : null,
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
      `Error searching for satellites: ${(error as Error).message}`
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
