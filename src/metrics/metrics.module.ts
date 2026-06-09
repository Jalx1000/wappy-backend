import { Module } from '@nestjs/common';
import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { MetricsInterceptor } from './metrics.interceptor';

export const HTTP_REQUEST_DURATION = 'wappy_http_request_duration_seconds';

@Module({
  providers: [
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    }),
    MetricsInterceptor,
  ],
  exports: [HTTP_REQUEST_DURATION, MetricsInterceptor],
})
export class MetricsModule {}
