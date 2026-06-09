import { describe, it } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from './utils/constants';

describe('Health (e2e)', () => {
  const app = APP_URL;

  it('should return 200 on GET /health (liveness)', () => {
    return request(app).get('/health').expect(200);
  });

  it('should return 200 on GET /ready (readiness — DB + Redis up)', () => {
    return request(app).get('/ready').expect(200);
  });
});
