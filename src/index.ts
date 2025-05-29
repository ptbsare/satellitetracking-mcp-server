#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { N2YOApiClient } from './api-client.js';
import { getSatellitePositionTool, getSatellitePositionToolSchema } from './tools/satellite-position.js';
import { getSatelliteTLETool, getSatelliteTLEToolSchema } from './tools/satellite-tle.js';
import { predictVisualPassesTool, predictVisualPassesToolSchema } from './tools/visual-passes.js';
import { predictRadioPassesTool, predictRadioPassesToolSchema } from './tools/radio-passes.js';
import { getSatellitesAboveTool, getSatellitesAboveToolSchema } from './tools/satellites-above.js';
import { searchSatellitesByNameTool, searchSatellitesByNameToolSchema } from './tools/satellite-search-by-name.js';
import { searchSatellitesByCategoryTool, searchSatellitesByCategoryToolSchema } from './tools/satellite-search-by-category.js';
import { getSatelliteResource, satelliteResourceTemplate } from './resources/satellite.js';
import { getSatellitesCategoryResource, satellitesCategoryResourceTemplate } from './resources/category.js';
import { getSatellitesAboveResource, satellitesAboveResourceTemplate } from './resources/above.js';

class SatelliteTrackingServer {
  private server: Server;
  private apiClient: N2YOApiClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'satellite-tracking-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    this.setupHandlers();
  }

  private getApiClient(): N2YOApiClient {
    if (!this.apiClient) {
      const apiKey = process.env.N2YO_API_KEY;
      if (!apiKey) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'N2YO_API_KEY environment variable is required'
        );
      }
      this.apiClient = new N2YOApiClient(apiKey);
    }
    return this.apiClient;
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        getSatellitePositionToolSchema,
        getSatelliteTLEToolSchema,
        predictVisualPassesToolSchema,
        predictRadioPassesToolSchema,
        getSatellitesAboveToolSchema,
        searchSatellitesByNameToolSchema,
        searchSatellitesByCategoryToolSchema,
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const apiClient = this.getApiClient();

      switch (request.params.name) {
        case 'get_satellite_position':
          return getSatellitePositionTool(apiClient, request.params.arguments as any);

        case 'get_satellite_tle':
          return getSatelliteTLETool(apiClient, request.params.arguments as any);

        case 'predict_visual_passes':
          return predictVisualPassesTool(apiClient, request.params.arguments as any);

        case 'predict_radio_passes':
          return predictRadioPassesTool(apiClient, request.params.arguments as any);

        case 'get_satellites_above':
          return getSatellitesAboveTool(apiClient, request.params.arguments as any);

        case 'search_satellites_by_name':
          return searchSatellitesByNameTool(apiClient, request.params.arguments as any);

        case 'search_satellites_by_category':
          return searchSatellitesByCategoryTool(apiClient, request.params.arguments as any);

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });

    // List resource templates
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
      resourceTemplates: [
        satelliteResourceTemplate,
        satellitesCategoryResourceTemplate,
        satellitesAboveResourceTemplate,
      ],
    }));

    // List static resources (none in this implementation)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [],
    }));

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const apiClient = this.getApiClient();
      const uri = request.params.uri;

      let content: string;

      if (uri.startsWith('satellite://')) {
        content = await getSatelliteResource(apiClient, uri);
      } else if (uri.startsWith('satellites://category/')) {
        content = await getSatellitesCategoryResource(apiClient, uri);
      } else if (uri.startsWith('satellites://above/')) {
        content = await getSatellitesAboveResource(apiClient, uri);
      } else {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Unsupported resource URI: ${uri}`
        );
      }

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: 'application/json',
            text: content,
          },
        ],
      };
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Satellite Tracking MCP server running on stdio');
  }
}

const server = new SatelliteTrackingServer();
server.run().catch(console.error);
