import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient, SatelliteTLE } from '../api-client.js';

export const getSatelliteTLEToolSchema = {
  name: 'get_satellite_tle',
  description: 'Get TLE (Two-Line Element) data for a satellite by NORAD ID',
  inputSchema: {
    type: 'object',
    properties: {
      norad_id: {
        type: 'number',
        description: 'NORAD ID of the satellite',
      },
    },
    required: ['norad_id'],
  },
};

export async function getSatelliteTLETool(
  apiClient: N2YOApiClient,
  args: { norad_id: number }
) {
  try {
    const { norad_id } = args;

    // Validate NORAD ID
    if (!Number.isInteger(norad_id) || norad_id <= 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid NORAD ID. Must be a positive integer.'
      );
    }

    const tleData = await apiClient.getTLE(norad_id);

    if (!tleData || !tleData.tle) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `No TLE data found for satellite with NORAD ID: ${norad_id}`
      );
    }

    // Parse TLE data
    const tleLines = tleData.tle.split('\r\n');

    // Format the response
    const formattedResponse = {
      satellite_id: norad_id,
      satellite_name: tleData.satname,
      tle: {
        line1: tleLines[0] || '',
        line2: tleLines[1] || '',
        line3: tleLines[2] || '',
      },
      updated: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedResponse, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Error retrieving satellite TLE data: ${(error as Error).message}`
    );
  }
}
