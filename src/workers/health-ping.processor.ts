import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('health-ping')
export class HealthPingProcessor extends WorkerHost {
  private readonly logger = new Logger(HealthPingProcessor.name);

  async process(_job: Job): Promise<void> {
    this.logger.log('worker alive');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed`);
  }
}
