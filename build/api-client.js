import axios from 'axios';
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
export class N2YOApiClient {
    constructor(apiKey) {
        this.baseUrl = 'https://api.n2yo.com/rest/v1/satellite';
        this.retryDelay = 1000; // Initial retry delay in ms
        this.maxRetries = 3;
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
    async makeRequest(endpoint, params = {}, retryCount = 0) {
        try {
            // Add API key to the endpoint
            const fullEndpoint = `${endpoint}/&apiKey=${this.apiKey}`;
            const config = {};
            const response = await this.axiosInstance.get(fullEndpoint, config);
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error;
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
                    throw new McpError(ErrorCode.InternalError, `${ERROR_MESSAGES.API_ERROR}: ${axiosError.response.status} - ${axiosError.response.data}`);
                }
                else {
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
    async getTLE(noradId) {
        const endpoint = `${ENDPOINTS.TLE}/${noradId}`;
        const response = await this.makeRequest(endpoint);
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
    async getPositions(params) {
        const { noradId, observer_lat, observer_lng, observer_alt = 0, seconds = 60 } = params;
        const endpoint = `${ENDPOINTS.POSITIONS}/${noradId}/${observer_lat}/${observer_lng}/${observer_alt}/${seconds}`;
        const response = await this.makeRequest(endpoint);
        return response.positions || [];
    }
    /**
     * Get visual passes for a satellite
     */
    async getVisualPasses(params) {
        const { noradId, observer_lat, observer_lng, observer_alt = 0, days = 7, min_visibility = 10 } = params;
        const endpoint = `${ENDPOINTS.VISUAL_PASSES}/${noradId}/${observer_lat}/${observer_lng}/${observer_alt}/${days}/${min_visibility}`;
        const response = await this.makeRequest(endpoint);
        return response.passes || [];
    }
    /**
     * Get radio passes for a satellite
     */
    async getRadioPasses(params) {
        const { noradId, observer_lat, observer_lng, observer_alt = 0, days = 7, min_elevation = 0 } = params;
        const endpoint = `${ENDPOINTS.RADIO_PASSES}/${noradId}/${observer_lat}/${observer_lng}/${observer_alt}/${days}/${min_elevation}`;
        const response = await this.makeRequest(endpoint);
        return response.passes || [];
    }
    /**
     * Get satellites above a location
     */
    async getAbove(params) {
        const { observer_lat, observer_lng, observer_alt = 0, search_radius = 90, category_id = 0 } = params;
        const endpoint = `${ENDPOINTS.ABOVE}/${observer_lat}/${observer_lng}/${observer_alt}/${search_radius}/${category_id}`;
        const response = await this.makeRequest(endpoint);
        return response.above || [];
    }
    /**
     * Search for satellites by name (using the above endpoint with category filtering)
     */
    async searchSatellites(searchQuery, category_id = 0) {
        // Use a default location (equator) and large search radius to get many satellites
        const params = {
            observer_lat: 0,
            observer_lng: 0,
            search_radius: 90,
            category_id,
        };
        const satellites = await this.getAbove(params);
        // Filter by name if search query is provided
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            return satellites.filter(sat => sat.satname.toLowerCase().includes(lowerQuery) ||
                sat.intDesignator.toLowerCase().includes(lowerQuery));
        }
        return satellites;
    }
}
//# sourceMappingURL=api-client.js.map