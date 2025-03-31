import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

// N2YO API endpoints
export const ENDPOINTS = {
  TLE: '/tle/',
  POSITIONS: '/positions/',
  VISUAL_PASSES: '/visualpasses/',
  RADIO_PASSES: '/radiopasses/',
  ABOVE: '/above/',
};

// Error messages
const ERROR_MESSAGES = {
  MISSING_API_KEY: 'N2YO API key is required',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded for N2YO API',
  INVALID_API_KEY: 'Invalid N2YO API key',
  API_ERROR: 'N2YO API error',
  NETWORK_ERROR: 'Network error while connecting to N2YO API',
};

// Interface for satellite position data
export interface SatellitePosition {
  satid: number;
  satname: string;
  satlatitude: number;
  satlongitude: number;
  sataltitude: number;
  azimuth: number;
  elevation: number;
  ra: number;
  dec: number;
  timestamp: number;
  eclipsed: boolean;
}

// Interface for satellite TLE data
export interface SatelliteTLE {
  satid: number;
  satname: string;
  transactionscount: number;
  tle: string;
}

// Interface for satellite pass data
export interface SatellitePass {
  satid: number;
  satname: string;
  startAz: number;
  startAzCompass: string;
  startEl: number;
  startUTC: number;
  maxAz: number;
  maxAzCompass: string;
  maxEl: number;
  maxUTC: number;
  endAz: number;
  endAzCompass: string;
  endEl: number;
  endUTC: number;
  mag: number;
  duration: number;
}

// Interface for satellite above data
export interface SatelliteAbove {
  satid: number;
  satname: string;
  intDesignator: string;
  launchDate: string;
  satlat: number;
  satlng: number;
  satalt: number;
}

// Interface for position parameters
export interface PositionParams {
  noradId: number;
  observer_lat: number;
  observer_lng: number;
  observer_alt?: number;
  seconds?: number;
}

// Interface for visual passes parameters
export interface VisualPassesParams {
  noradId: number;
  observer_lat: number;
  observer_lng: number;
  observer_alt?: number;
  days?: number;
  min_visibility?: number;
}

// Interface for radio passes parameters
export interface RadioPassesParams {
  noradId: number;
  observer_lat: number;
  observer_lng: number;
  observer_alt?: number;
  days?: number;
  min_elevation?: number;
}

// Interface for above parameters
export interface AboveParams {
  observer_lat: number;
  observer_lng: number;
  observer_alt?: number;
  search_radius?: number;
  category_id?: number;
}

export class N2YOApiClient {
  private axiosInstance: AxiosInstance;
  private apiKey: string;
  private baseUrl: string = 'https://api.n2yo.com/rest/v1/satellite';
  private retryDelay: number = 1000; // Initial retry delay in ms
  private maxRetries: number = 3;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new McpError(ErrorCode.InvalidParams, ERROR_MESSAGES.MISSING_API_KEY);
    }

    this.apiKey = apiKey;
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Make an API request with retry logic for rate limiting
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
    retryCount: number = 0
  ): Promise<T> {
    try {
      // Add API key to the endpoint
      const fullEndpoint = `${endpoint}/&apiKey=${this.apiKey}`;

      const config: AxiosRequestConfig = {};

      const response: AxiosResponse = await this.axiosInstance.get(fullEndpoint, config);
      return response.data as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle rate limiting (429 Too Many Requests)
        if (axiosError.response?.status === 429 && retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeRequest(endpoint, params, retryCount + 1);
        }

        // Handle authentication errors
        if (axiosError.response?.status === 401) {
          throw new McpError(ErrorCode.InvalidRequest, ERROR_MESSAGES.INVALID_API_KEY);
        }

        // Handle other API errors
        if (axiosError.response) {
          throw new McpError(
            ErrorCode.InternalError,
            `${ERROR_MESSAGES.API_ERROR}: ${axiosError.response.status} - ${axiosError.response.data}`
          );
        } else {
          throw new McpError(ErrorCode.InternalError, ERROR_MESSAGES.NETWORK_ERROR);
        }
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get TLE data for a satellite
   */
  async getTLE(noradId: number): Promise<SatelliteTLE> {
    const endpoint = `${ENDPOINTS.TLE}/${noradId}`;
    const response = await this.makeRequest<{ info: any, tle: string }>(endpoint);

    return {
      satid: noradId,
      satname: response.info?.satname || `Satellite ${noradId}`,
      transactionscount: response.info?.transactionscount || 0,
      tle: response.tle,
    };
  }

  /**
   * Get positions of a satellite for a given time period
   */
  async getPositions(params: PositionParams): Promise<SatellitePosition[]> {
    const { noradId, observer_lat, observer_lng, observer_alt = 0, seconds = 60 } = params;

    const endpoint = `${ENDPOINTS.POSITIONS}/${noradId}/${observer_lat}/${observer_lng}/${observer_alt}/${seconds}`;
    const response = await this.makeRequest<{ info: any, positions: SatellitePosition[] }>(endpoint);

    return response.positions || [];
  }

  /**
   * Get visual passes for a satellite
   */
  async getVisualPasses(params: VisualPassesParams): Promise<SatellitePass[]> {
    const { noradId, observer_lat, observer_lng, observer_alt = 0, days = 7, min_visibility = 10 } = params;

    const endpoint = `${ENDPOINTS.VISUAL_PASSES}/${noradId}/${observer_lat}/${observer_lng}/${observer_alt}/${days}/${min_visibility}`;
    const response = await this.makeRequest<{ info: any, passes: SatellitePass[] }>(endpoint);

    return response.passes || [];
  }

  /**
   * Get radio passes for a satellite
   */
  async getRadioPasses(params: RadioPassesParams): Promise<SatellitePass[]> {
    const { noradId, observer_lat, observer_lng, observer_alt = 0, days = 7, min_elevation = 0 } = params;

    const endpoint = `${ENDPOINTS.RADIO_PASSES}/${noradId}/${observer_lat}/${observer_lng}/${observer_alt}/${days}/${min_elevation}`;
    const response = await this.makeRequest<{ info: any, passes: SatellitePass[] }>(endpoint);

    return response.passes || [];
  }

  /**
   * Get satellites above a location
   */
  async getAbove(params: AboveParams): Promise<SatelliteAbove[]> {
    const { observer_lat, observer_lng, observer_alt = 0, search_radius = 90, category_id = 0 } = params;

    const endpoint = `${ENDPOINTS.ABOVE}/${observer_lat}/${observer_lng}/${observer_alt}/${search_radius}/${category_id}`;
    const response = await this.makeRequest<{ info: any, above: SatelliteAbove[] }>(endpoint);

    return response.above || [];
  }

  /**
   * Search for satellites by name (using the above endpoint with category filtering)
   */
  async searchSatellites(searchQuery: string, category_id: number = 0): Promise<SatelliteAbove[]> {
    // Use a default location (equator) and large search radius to get many satellites
    const params: AboveParams = {
      observer_lat: 0,
      observer_lng: 0,
      search_radius: 90,
      category_id,
    };

    const satellites = await this.getAbove(params);

    // Filter by name if search query is provided
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      return satellites.filter(sat =>
        sat.satname.toLowerCase().includes(lowerQuery) ||
        sat.intDesignator.toLowerCase().includes(lowerQuery)
      );
    }

    return satellites;
  }
}
