import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('health-ping')
export class HealthPingProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthPingProcessor.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async process(job: Job): Promise<void> {
    this.logger.log(`worker alive (job ${job.id})`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }
}
