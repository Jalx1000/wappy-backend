import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from './utils/constants';

describe('Smoke', () => {
  const app = APP_URL;

  it('GET /api/v1/_test/translate with x-custom-lang: en returns lang: en', () => {
    return request(app)
      .get('/api/v1/_test/translate')
      .set('x-custom-lang', 'en')
      .expect(200)
      .expect(({ body }) => {
        expect(body.lang).toBe('en');
      });
  });

  it('GET /api/v1/_test/translate with x-custom-lang: es returns lang: es', () => {
    return request(app)
      .get('/api/v1/_test/translate')
      .set('x-custom-lang', 'es')
      .expect(200)
      .expect(({ body }) => {
        expect(body.lang).toBe('es');
      });
  });

  it('GET /api/v1/_test/translate with x-custom-lang: pt-BR returns lang: pt-BR', () => {
    return request(app)
      .get('/api/v1/_test/translate')
      .set('x-custom-lang', 'pt-BR')
      .expect(200)
      .expect(({ body }) => {
        expect(body.lang).toBe('pt-BR');
      });
  });

  it('GET /metrics returns 200 with Prometheus text format', () => {
    return request(app)
      .get('/metrics')
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('# HELP');
      });
  });
});
