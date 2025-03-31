import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient, RadioPassesParams, SatellitePass } from '../api-client.js';

export const predictRadioPassesToolSchema = {
  name: 'predict_radio_passes',
  description: 'Predict radio frequency passes of a satellite over a location',
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
      days: {
        type: 'number',
        description: 'Number of days to predict (1-10)',
        minimum: 1,
        maximum: 10,
      },
      min_elevation: {
        type: 'number',
        description: 'Minimum elevation in degrees (0-90)',
        minimum: 0,
        maximum: 90,
      },
    },
    required: ['norad_id', 'observer_lat', 'observer_lng'],
  },
};

export async function predictRadioPassesTool(
  apiClient: N2YOApiClient,
  args: {
    norad_id: number;
    observer_lat: number;
    observer_lng: number;
    observer_alt?: number;
    days?: number;
    min_elevation?: number;
  }
) {
  try {
    const { norad_id, observer_lat, observer_lng, observer_alt, days, min_elevation } = args;

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

    // Validate days
    if (days !== undefined && (!Number.isInteger(days) || days < 1 || days > 10)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid days. Must be an integer between 1 and 10.'
      );
    }

    // Validate min_elevation
    if (min_elevation !== undefined && (min_elevation < 0 || min_elevation > 90)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid min_elevation. Must be between 0 and 90 degrees.'
      );
    }

    const params: RadioPassesParams = {
      noradId: norad_id,
      observer_lat,
      observer_lng,
      observer_alt,
      days,
      min_elevation,
    };

    const passes = await apiClient.getRadioPasses(params);

    if (!passes || passes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              satellite_id: norad_id,
              observer: {
                latitude: observer_lat,
                longitude: observer_lng,
                altitude: observer_alt || 0,
              },
              prediction_days: days || 7,
              passes: [],
              message: `No radio passes found for satellite ${norad_id} in the next ${days || 7} days.`,
            }, null, 2),
          },
        ],
      };
    }

    // Format the response
    const formattedPasses = passes.map(pass => formatPassData(pass));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            satellite_id: norad_id,
            satellite_name: passes[0].satname,
            observer: {
              latitude: observer_lat,
              longitude: observer_lng,
              altitude: observer_alt || 0,
            },
            prediction_days: days || 7,
            min_elevation: min_elevation || 0,
            passes: formattedPasses,
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
      `Error predicting satellite radio passes: ${(error as Error).message}`
    );
  }
}

function formatPassData(pass: SatellitePass) {
  // Convert timestamps to ISO strings
  const startDate = new Date(pass.startUTC * 1000);
  const maxDate = new Date(pass.maxUTC * 1000);
  const endDate = new Date(pass.endUTC * 1000);

  return {
    start: {
      time: startDate.toISOString(),
      azimuth: pass.startAz,
      azimuth_compass: pass.startAzCompass,
      elevation: pass.startEl,
    },
    max: {
      time: maxDate.toISOString(),
      azimuth: pass.maxAz,
      azimuth_compass: pass.maxAzCompass,
      elevation: pass.maxEl,
    },
    end: {
      time: endDate.toISOString(),
      azimuth: pass.endAz,
      azimuth_compass: pass.endAzCompass,
      elevation: pass.endEl,
    },
    duration_seconds: pass.duration,
  };
}
