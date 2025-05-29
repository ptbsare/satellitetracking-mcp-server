import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient, SatelliteAbove } from '../api-client.js'; // Assuming SatelliteAbove is correct
import { CATEGORY_MAPPING, formatSatelliteData } from './tool-utils.js';

export const searchSatellitesByCategoryToolSchema = {
  name: 'search_satellites_by_category',
  description: 'Search for satellites by category ID',
  inputSchema: {
    type: 'object',
    properties: {
      category_id: {
        type: 'number',
        description: 'Category ID (0=all, 1=amateur, 2=cubesat, 3=education, 4=engineering, 5=galileo, 6=glo-ops, 7=gps-ops, 8=military, 9=radar, 10=resource, 11=sarsat, 12=science, 13=tdrss, 14=weather, 15=xm/sirius, 16=iridium-next, 17=globalstar, 18=intelsat, 19=ses, 20=telesat, 21=orbcomm, 22=gorizont, 23=raduga, 24=molniya, 25=dmc, 26=argos, 27=planet, 28=spire, 29=starlink, 30=oneweb)',
        minimum: 0,
        maximum: 30,
      },
    },
    required: ['category_id'],
  },
};

export async function searchSatellitesByCategoryTool(
  apiClient: N2YOApiClient,
  args: {
    category_id: number;
  }
) {
  try {
    const { category_id } = args;

    // Validate category_id (though schema should enforce type, good to keep runtime check)
    if (category_id === undefined || !Number.isInteger(category_id) || category_id < 0 || category_id > 30) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid category_id. Must be an integer between 0 and 30.'
      );
    }

    // Search for satellites
    const satellites = await apiClient.searchSatellites('', category_id); // Pass empty string for query

    const categoryName = CATEGORY_MAPPING[category_id] || `Unknown (${category_id})`;

    if (!satellites || satellites.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: null,
              category: categoryName,
              satellites: [],
              count: 0,
              message: `No satellites found in category: ${categoryName}.`,
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
            query: null,
            category: categoryName,
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
    console.error(`Error in searchSatellitesByCategoryTool: ${error}`);
    throw new McpError(
      ErrorCode.InternalError,
      `Error searching for satellites by category: ${(error as Error).message}`
    );
  }
}
