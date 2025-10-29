const axios = require('axios');

class OpenMemoryService {
  constructor() {
    this.baseUrl = process.env.OPENMEMORY_URL || 'http://localhost:8080';
    this.mcpEndpoint = `${this.baseUrl}/mcp`;
    this.healthEndpoint = `${this.baseUrl}/health`;
  }

  async healthCheck() {
    try {
      const response = await axios.get(this.healthEndpoint, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('OpenMemory health check failed:', error.message);
      return false;
    }
  }

  async storeMemory(content, metadata = {}) {
    try {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tools/call',
        params: {
          name: 'openmemory.store',
          arguments: {
            content: content,
            metadata: {
              ...metadata,
              timestamp: new Date().toISOString(),
              source: 'ghibli-cafe-chat'
            }
          }
        }
      };

      const response = await axios.post(this.mcpEndpoint, mcpRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(`OpenMemory store error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Failed to store memory:', error.message);
      throw error;
    }
  }

  async queryMemories(query, options = {}) {
    try {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tools/call',
        params: {
          name: 'openmemory.query',
          arguments: {
            query: query,
            k: options.k || 5,
            filters: options.filters || {}
          }
        }
      };

      const response = await axios.post(this.mcpEndpoint, mcpRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(`OpenMemory query error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Failed to query memories:', error.message);
      throw error;
    }
  }

  async reinforceMemory(memoryId, importance = 1.0) {
    try {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tools/call',
        params: {
          name: 'openmemory.reinforce',
          arguments: {
            memory_id: memoryId,
            importance: importance
          }
        }
      };

      const response = await axios.post(this.mcpEndpoint, mcpRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(`OpenMemory reinforce error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Failed to reinforce memory:', error.message);
      throw error;
    }
  }

  async listMemories(options = {}) {
    try {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tools/call',
        params: {
          name: 'openmemory.list',
          arguments: {
            limit: options.limit || 50,
            offset: options.offset || 0,
            filters: options.filters || {}
          }
        }
      };

      const response = await axios.post(this.mcpEndpoint, mcpRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(`OpenMemory list error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Failed to list memories:', error.message);
      throw error;
    }
  }

  async getMemory(memoryId) {
    try {
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tools/call',
        params: {
          name: 'openmemory.get',
          arguments: {
            memory_id: memoryId
          }
        }
      };

      const response = await axios.post(this.mcpEndpoint, mcpRequest, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response.data.error) {
        throw new Error(`OpenMemory get error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Failed to get memory:', error.message);
      throw error;
    }
  }
}

module.exports = OpenMemoryService;
