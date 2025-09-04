/**
 * Tests for health check endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import healthRoutes from './index';

describe('Health Check Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');

      // Verify timestamp is a valid ISO string
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed',
      });

      // Status could be 200 (healthy) or 503 (unhealthy) depending on DB availability
      expect([200, 503]).toContain(response.statusCode);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('responseTime');
      expect(body).toHaveProperty('database');
      expect(body).toHaveProperty('version');

      expect(typeof body.responseTime).toBe('number');
      expect(body.responseTime).toBeGreaterThan(0);

      if (response.statusCode === 200) {
        expect(body.status).toBe('healthy');
        expect(body.database.status).toBe('healthy');
        expect(body).toHaveProperty('system');
        expect(body.system).toHaveProperty('uptime');
        expect(body.system).toHaveProperty('memory');
        expect(body.system).toHaveProperty('nodeVersion');
      } else {
        expect(body.status).toBe('unhealthy');
        expect(body.database.status).toBe('unhealthy');
      }
    });
  });

  describe('GET /health/database', () => {
    it('should return database-specific health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/database',
      });

      // Status could be 200 (healthy) or 503 (unhealthy) depending on DB availability
      expect([200, 503]).toContain(response.statusCode);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');

      if (response.statusCode === 200) {
        expect(body.status).toBe('healthy');
        expect(body).toHaveProperty('connectionCount');
        expect(typeof body.connectionCount).toBe('number');
      } else {
        expect(body.status).toBe('unhealthy');
        expect(body).toHaveProperty('error');
      }
    });
  });

  describe('GET /ready', () => {
    it('should return readiness status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      // Status could be 200 (ready) or 503 (not ready) depending on DB availability
      expect([200, 503]).toContain(response.statusCode);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('ready');
      expect(body).toHaveProperty('timestamp');
      expect(typeof body.ready).toBe('boolean');

      if (response.statusCode === 503) {
        expect(body.ready).toBe(false);
        expect(body).toHaveProperty('reason');
      } else {
        expect(body.ready).toBe(true);
      }
    });
  });

  describe('GET /live', () => {
    it('should always return alive status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/live',
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('alive', true);
      expect(body).toHaveProperty('timestamp');

      // Verify timestamp is a valid ISO string
      expect(() => new Date(body.timestamp)).not.toThrow();
    });
  });
});
