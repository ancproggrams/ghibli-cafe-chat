/**
 * Model Health Checking Service
 * Regularly checks model health and maintains status
 */
const axios = require('axios');

class ModelHealthService {
  constructor(ollamaBaseUrl, options = {}) {
    this.ollamaBaseUrl = ollamaBaseUrl;
    this.checkInterval = options.checkInterval || 60000; // 60 seconds
    this.checkTimeout = options.checkTimeout || 10000; // 10 seconds
    this.modelHealth = new Map(); // model -> { status: 'healthy'|'unhealthy'|'unknown', lastCheck: timestamp }
    this.healthCheckInterval = null;
  }

  /**
   * Start periodic health checks
   */
  start() {
    if (this.healthCheckInterval) {
      return; // Already started
    }

    // Initial health check
    this.checkAllModels();

    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkAllModels();
    }, this.checkInterval);

    console.log('[ModelHealthService] Started periodic health checks');
  }

  /**
   * Stop periodic health checks
   */
  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('[ModelHealthService] Stopped periodic health checks');
    }
  }

  /**
   * Check health of all configured models
   */
  async checkAllModels() {
    const models = [
      'llama3.2:latest',
      'phi3:mini',
      'gpt-oss:20b'
    ];

    for (const model of models) {
      await this.checkModelHealth(model);
    }
  }

  /**
   * Check health of a specific model
   */
  async checkModelHealth(model) {
    try {
      const startTime = Date.now();
      
      // Minimal test request (1 token)
      const response = await axios.post(
        `${this.ollamaBaseUrl}/api/generate`,
        {
          model: model,
          prompt: 'test',
          stream: false,
          options: {
            num_predict: 1,
            temperature: 0.1
          }
        },
        {
          timeout: this.checkTimeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const responseTime = Date.now() - startTime;
      const isHealthy = response.status === 200 && response.data?.response;

      this.modelHealth.set(model, {
        status: isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: Date.now(),
        responseTime: responseTime
      });

      if (isHealthy) {
        console.log(`[ModelHealthService] ✓ ${model} is healthy (${responseTime}ms)`);
      } else {
        console.log(`[ModelHealthService] ✗ ${model} is unhealthy`);
      }

      return isHealthy;
    } catch (error) {
      this.modelHealth.set(model, {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: error.message
      });

      console.log(`[ModelHealthService] ✗ ${model} health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get health status of a model
   */
  getModelHealth(model) {
    const health = this.modelHealth.get(model);
    
    if (!health) {
      return { status: 'unknown', lastCheck: null };
    }

    // Consider stale if last check was more than 2 intervals ago
    const staleThreshold = this.checkInterval * 2;
    if (Date.now() - health.lastCheck > staleThreshold) {
      return { ...health, status: 'unknown' };
    }

    return health;
  }

  /**
   * Check if model is healthy
   */
  isModelHealthy(model) {
    const health = this.getModelHealth(model);
    return health.status === 'healthy';
  }

  /**
   * Get all model health statuses
   */
  getAllModelHealth() {
    const healthMap = {};
    for (const [model, health] of this.modelHealth.entries()) {
      healthMap[model] = health;
    }
    return healthMap;
  }

  /**
   * Get healthy models only
   */
  getHealthyModels() {
    const healthy = [];
    for (const [model, health] of this.modelHealth.entries()) {
      if (health.status === 'healthy') {
        healthy.push(model);
      }
    }
    return healthy;
  }
}

module.exports = ModelHealthService;

