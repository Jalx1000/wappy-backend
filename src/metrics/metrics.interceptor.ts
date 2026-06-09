import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HTTP_REQUEST_DURATION } from './metrics.module';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION)
    private readonly histogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method } = req;
    const end = this.histogram.startTimer();

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        end({
          method,
          route: req.route?.path ?? req.path,
          status_code: res.statusCode,
        });
      }),
    );
  }
}
