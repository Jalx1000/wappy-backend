import { Module } from '@nestjs/common';
import { I18nTestController } from './i18n-test.controller';

@Module({
  controllers: [I18nTestController],
})
export class I18nTestModule {}
