import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AboveParams, N2YOApiClient, SatelliteAbove } from '../api-client.js';

export const satellitesAboveResourceTemplate = {
  uriTemplate: 'satellites://above/{lat}/{lon}/{radius}',
  name: 'Satellites Above Location',
  description: 'List of satellites above a specified location',
  mimeType: 'application/json',
};

export async function getSatellitesAboveResource(
  apiClient: N2YOApiClient,
  uri: string
): Promise<string> {
  try {
    // Extract the parameters from the URI
    const match = uri.match(/^satellites:\/\/above\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid satellites above resource URI: ${uri}`
      );
    }

    const latitude = parseFloat(decodeURIComponent(match[1]));
    const longitude = parseFloat(decodeURIComponent(match[2]));
    const radius = parseFloat(decodeURIComponent(match[3]));

    // Validate coordinates
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid latitude. Must be a number between -90 and 90.'
      );
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid longitude. Must be a number between -180 and 180.'
      );
    }

    // Validate radius
    if (isNaN(radius) || radius < 0 || radius > 90) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid radius. Must be a number between 0 and 90 degrees.'
      );
    }

    const params: AboveParams = {
      observer_lat: latitude,
      observer_lng: longitude,
      search_radius: radius,
      category_id: 0, // All categories
    };

    const satellites = await apiClient.getAbove(params);

    if (!satellites || satellites.length === 0) {
      return JSON.stringify({
        location: {
          latitude,
          longitude,
        },
        radius: radius,
        satellites: [],
        count: 0,
        message: 'No satellites found above the specified location.',
        timestamp: new Date().toISOString(),
      }, null, 2);
    }

    // Format the response
    const formattedSatellites = satellites.map(sat => formatSatelliteData(sat));

    return JSON.stringify({
      location: {
        latitude,
        longitude,
      },
      radius: radius,
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
      `Error retrieving satellites above location: ${(error as Error).message}`
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
