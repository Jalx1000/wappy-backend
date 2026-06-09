import { Controller, Get } from '@nestjs/common';
import { I18n, I18nContext, I18nLang } from 'nestjs-i18n';

@Controller('api/v1/_test')
export class I18nTestController {
  @Get('translate')
  translate(@I18nLang() lang: string, @I18n() i18n: I18nContext) {
    return {
      lang,
      notFound: i18n.t('errors.common.notFound'),
    };
  }
}
