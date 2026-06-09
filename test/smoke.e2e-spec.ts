import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from './utils/constants';

describe('Smoke', () => {
  const app = APP_URL;

  it('should return lang: en when x-custom-lang header is en', () => {
    return request(app)
      .get('/api/v1/_test/translate')
      .set('x-custom-lang', 'en')
      .expect(200)
      .expect(({ body }) => {
        expect(body.lang).toBe('en');
      });
  });

  it('should return lang: es when x-custom-lang header is es', () => {
    return request(app)
      .get('/api/v1/_test/translate')
      .set('x-custom-lang', 'es')
      .expect(200)
      .expect(({ body }) => {
        expect(body.lang).toBe('es');
      });
  });

  it('should return lang: pt-BR when x-custom-lang header is pt-BR', () => {
    return request(app)
      .get('/api/v1/_test/translate')
      .set('x-custom-lang', 'pt-BR')
      .expect(200)
      .expect(({ body }) => {
        expect(body.lang).toBe('pt-BR');
      });
  });

  it('should return 200 with Prometheus text format on GET /metrics', () => {
    return request(app)
      .get('/metrics')
      .expect(200)
      .expect(({ text }) => {
        expect(text).toContain('# HELP');
      });
  });
});
