import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379/0';
    const client = new Redis(url);
    try {
      const result = await client.ping();
      const isHealthy = result === 'PONG';
      return this.getStatus(key, isHealthy);
    } catch {
      return this.getStatus(key, false);
    } finally {
      await client.quit();
    }
  }
}
