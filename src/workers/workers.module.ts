import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { HealthPingProcessor } from './health-ping.processor';
import { HealthPingScheduler } from './health-ping.scheduler';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // WORKER_HOST is a full Redis URL (e.g. redis://redis:6379/1)
        const workerHost = configService.get<string>(
          'WORKER_HOST',
          'redis://localhost:6379/1',
        );
        const url = new URL(workerHost);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            db: Number(url.pathname.replace('/', '')) || 0,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: 'health-ping' }),
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'health-ping',
      adapter: BullMQAdapter,
    }),
  ],
  providers: [HealthPingProcessor, HealthPingScheduler],
})
export class WorkersModule {}
