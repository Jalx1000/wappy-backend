import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class HealthPingScheduler implements OnModuleInit {
  constructor(@InjectQueue('health-ping') private readonly queue: Queue) {}

  async onModuleInit() {
    // Remove existing repeatable jobs to avoid duplicates on restart
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await this.queue.removeRepeatableByKey(job.key);
    }
    await this.queue.add('ping', {}, { repeat: { every: 30000 } });
  }
}
