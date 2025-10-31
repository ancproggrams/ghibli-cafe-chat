/**
 * Connection Pool for Ollama API
 * Manages HTTP connections for better resource efficiency
 */
const axios = require('axios');
const https = require('https');
const http = require('http');

class OllamaPool {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.maxConnections = options.maxConnections || 10;
    this.idleTimeout = options.idleTimeout || 300000; // 5 minutes
    this.activeConnections = 0;
    this.idleConnections = [];
    this.waitingQueue = [];
    
    // Create HTTP agent with connection pooling
    const isHttps = baseUrl.startsWith('https');
    const Agent = isHttps ? https.Agent : http.Agent;
    
    this.agent = new Agent({
      keepAlive: true,
      maxSockets: this.maxConnections,
      maxFreeSockets: 5,
      timeout: 60000,
      keepAliveMsecs: 1000
    });
  }

  /**
   * Make request using connection pool
   */
  async request(config) {
    return new Promise((resolve, reject) => {
      // Check if we can create new connection
      if (this.activeConnections >= this.maxConnections) {
        // Add to waiting queue
        this.waitingQueue.push({ config, resolve, reject });
        return;
      }

      this.executeRequest(config, resolve, reject);
    });
  }

  /**
   * Execute request
   */
  async executeRequest(config, resolve, reject) {
    this.activeConnections++;

    try {
      // Extract URL from config
      const url = config.url || config.path || '';
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      const response = await axios({
        method: config.method || 'POST',
        url: fullUrl,
        data: config.data,
        params: config.params,
        headers: config.headers,
        httpAgent: this.agent,
        httpsAgent: this.agent,
        timeout: config.timeout || 20000
      });

      this.activeConnections--;
      this.processWaitingQueue();
      resolve(response);
    } catch (error) {
      this.activeConnections--;
      this.processWaitingQueue();
      reject(error);
    }
  }

  /**
   * Process waiting queue
   */
  processWaitingQueue() {
    if (this.waitingQueue.length > 0 && this.activeConnections < this.maxConnections) {
      const next = this.waitingQueue.shift();
      this.executeRequest(next.config, next.resolve, next.reject);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      maxConnections: this.maxConnections,
      activeConnections: this.activeConnections,
      idleConnections: this.idleConnections.length,
      waitingQueue: this.waitingQueue.length,
      availableConnections: this.maxConnections - this.activeConnections
    };
  }

  /**
   * Destroy pool
   */
  destroy() {
    this.agent.destroy();
    this.waitingQueue = [];
    this.idleConnections = [];
    this.activeConnections = 0;
  }
}

module.exports = OllamaPool;

