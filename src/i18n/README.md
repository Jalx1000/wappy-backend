# i18n

Translation bundles for Wappy. Served by `nestjs-i18n`, already configured in `app.module.ts`. Do not re-register `I18nModule`.

## Key convention

Keys follow the pattern `module.feature.key`, matching the file name and nesting:

- `errors.common.notFound` — from `errors.json` → `common.notFound`
- `auth.login.invalidCredentials` — from `auth.json` → `login.invalidCredentials`
- `common.ok` — from `common.json` → `ok`

## Base bundles

| File | Purpose |
|------|---------|
| `common.json` | Generic status messages shared across features |
| `errors.json` | Reusable error messages (not found, unauthorized, validation) |
| `emails.json` | Email content strings — placeholder, filled in future sprints |

## Supported locales

- `en/` — English (fallback language)
- `es/` — Spanish
- `pt-BR/` — Brazilian Portuguese

## Adding a new key

1. Add the key to `en/<bundle>.json`.
2. Add the translation to `es/<bundle>.json`.
3. Add the translation to `pt-BR/<bundle>.json`.

All three files must stay in sync — missing keys fall back to the `fallbackLanguage` (`en`).

## Using translations in a controller

```typescript
import { Controller, Get } from '@nestjs/common';
import { I18n, I18nContext, I18nLang } from 'nestjs-i18n';

@Controller('example')
export class ExampleController {
  @Get()
  handle(@I18nLang() lang: string, @I18n() i18n: I18nContext) {
    return i18n.t('errors.common.notFound');
  }
}
```

The active language is resolved from the `x-custom-lang` request header. If absent, `fallbackLanguage` (`en`) is used.

## Using translations in a service

```typescript
import { I18nContext } from 'nestjs-i18n';

const i18n = I18nContext.current();
const message = i18n?.t('errors.common.notFound') ?? 'Resource not found';
```
