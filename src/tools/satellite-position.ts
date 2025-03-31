import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient, PositionParams, SatellitePosition } from '../api-client.js';

export const getSatellitePositionToolSchema = {
  name: 'get_satellite_position',
  description: 'Get real-time position of a satellite by NORAD ID',
  inputSchema: {
    type: 'object',
    properties: {
      norad_id: {
        type: 'number',
        description: 'NORAD ID of the satellite',
      },
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
      seconds: {
        type: 'number',
        description: 'Number of seconds to predict (1-300)',
        minimum: 1,
        maximum: 300,
      },
    },
    required: ['norad_id', 'observer_lat', 'observer_lng'],
  },
};

export async function getSatellitePositionTool(
  apiClient: N2YOApiClient,
  args: {
    norad_id: number;
    observer_lat: number;
    observer_lng: number;
    observer_alt?: number;
    seconds?: number;
  }
) {
  try {
    const { norad_id, observer_lat, observer_lng, observer_alt, seconds } = args;

    // Validate NORAD ID
    if (!Number.isInteger(norad_id) || norad_id <= 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid NORAD ID. Must be a positive integer.'
      );
    }

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

    // Validate seconds
    if (seconds !== undefined && (seconds < 1 || seconds > 300)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid seconds. Must be between 1 and 300.'
      );
    }

    const params: PositionParams = {
      noradId: norad_id,
      observer_lat,
      observer_lng,
      observer_alt,
      seconds,
    };

    const positions = await apiClient.getPositions(params);

    if (!positions || positions.length === 0) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `No position data found for satellite with NORAD ID: ${norad_id}`
      );
    }

    // Format the response
    const formattedPositions = positions.map(pos => formatPositionData(pos));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            satellite_id: norad_id,
            satellite_name: positions[0].satname,
            observer: {
              latitude: observer_lat,
              longitude: observer_lng,
              altitude: observer_alt || 0,
            },
            positions: formattedPositions,
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
      `Error retrieving satellite position: ${(error as Error).message}`
    );
  }
}

function formatPositionData(position: SatellitePosition) {
  // Convert timestamp to ISO string
  const date = new Date(position.timestamp * 1000);

  return {
    timestamp: date.toISOString(),
    position: {
      latitude: position.satlatitude,
      longitude: position.satlongitude,
      altitude: position.sataltitude,
    },
    azimuth: position.azimuth,
    elevation: position.elevation,
    right_ascension: position.ra,
    declination: position.dec,
    eclipsed: position.eclipsed,
  };
}
