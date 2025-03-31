import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { N2YOApiClient } from '../api-client.js';

export const satelliteResourceTemplate = {
  uriTemplate: 'satellite://{norad_id}',
  name: 'Satellite Information',
  description: 'Information about a satellite by NORAD ID',
  mimeType: 'application/json',
};

export async function getSatelliteResource(
  apiClient: N2YOApiClient,
  uri: string
): Promise<string> {
  try {
    // Extract the NORAD ID from the URI
    const match = uri.match(/^satellite:\/\/(\d+)$/);
    if (!match) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Invalid satellite resource URI: ${uri}`
      );
    }

    const noradId = parseInt(match[1], 10);

    // Validate NORAD ID
    if (!Number.isInteger(noradId) || noradId <= 0) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Invalid NORAD ID. Must be a positive integer.'
      );
    }

    // Get both TLE and position data
    // Use a default observer location (equator) for position data
    const [tleData, positions] = await Promise.all([
      apiClient.getTLE(noradId).catch(error => {
        console.error('Error fetching satellite TLE:', error);
        return null;
      }),
      apiClient.getPositions({
        noradId,
        observer_lat: 0,
        observer_lng: 0,
        seconds: 1,
      }).catch(error => {
        console.error('Error fetching satellite position:', error);
        return null;
      }),
    ]);

    if (!tleData && !positions) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `No data found for satellite with NORAD ID: ${noradId}`
      );
    }

    // Parse TLE data if available
    let tleLines: string[] = [];
    if (tleData && tleData.tle) {
      tleLines = tleData.tle.split('\r\n');
    }

    // Combine the data
    const satelliteData: any = {
      norad_id: noradId,
      name: (tleData?.satname || positions?.[0]?.satname || `Satellite ${noradId}`),
    };

    // Add TLE data if available
    if (tleData && tleLines.length > 0) {
      satelliteData.tle = {
        line1: tleLines[0] || '',
        line2: tleLines[1] || '',
        line3: tleLines[2] || '',
      };
    }

    // Add position data if available
    if (positions && positions.length > 0) {
      const position = positions[0];
      const timestamp = new Date(position.timestamp * 1000);

      satelliteData.position = {
        timestamp: timestamp.toISOString(),
        latitude: position.satlatitude,
        longitude: position.satlongitude,
        altitude: position.sataltitude,
        eclipsed: position.eclipsed,
      };
    }

    // Add timestamp
    satelliteData.updated = new Date().toISOString();

    return JSON.stringify(satelliteData, null, 2);
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    throw new McpError(
      ErrorCode.InternalError,
      `Error retrieving satellite resource: ${(error as Error).message}`
    );
  }
}
