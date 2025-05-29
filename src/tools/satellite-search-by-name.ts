import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient, SatelliteAbove } from '../api-client.js'; // Assuming SatelliteAbove is the correct type for individual satellite data
import { CATEGORY_MAPPING, formatSatelliteData } from './tool-utils.js'; // We'll need to extract common functions

export const searchSatellitesByNameToolSchema = {
  name: 'search_satellites_by_name',
  description: 'Search for satellites by name',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for satellite name',
      },
    },
    required: ['query'],
  },
};

export async function searchSatellitesByNameTool(
  apiClient: N2YOApiClient,
  args: {
    query: string;
  }
) {
  try {
    const { query } = args;

    // Search for satellites
    const satellites = await apiClient.searchSatellites(query, undefined); // Pass undefined for category_id

    if (!satellites || satellites.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: query,
              category: null,
              satellites: [],
              count: 0,
              message: 'No satellites found matching the search name.',
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
            query: query,
            category: null,
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
    console.error(`Error in searchSatellitesByNameTool: ${error}`);
    throw new McpError(
      ErrorCode.InternalError,
      `Error searching for satellites by name: ${(error as Error).message}`
    );
  }
}
