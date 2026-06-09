import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { UsersModule } from './users/users.module';
import { FilesModule } from './files/files.module';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './database/config/database.config';
import authConfig from './auth/config/auth.config';
import appConfig from './config/app.config';
import mailConfig from './mail/config/mail.config';
import fileConfig from './files/config/file.config';
import facebookConfig from './auth-facebook/config/facebook.config';
import googleConfig from './auth-google/config/google.config';
import path from 'path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthFacebookModule } from './auth-facebook/auth-facebook.module';
import { AuthGoogleModule } from './auth-google/auth-google.module';
import { HeaderResolver, I18nModule } from 'nestjs-i18n';
import { TypeOrmConfigService } from './database/typeorm-config.service';
import { MailModule } from './mail/mail.module';
import { HomeModule } from './home/home.module';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AllConfigType } from './config/config.type';
import { SessionModule } from './session/session.module';
import { MailerModule } from './mailer/mailer.module';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { I18nTestModule } from './i18n/i18n-test.module';
import { WorkersModule } from './workers/workers.module';

const infrastructureDatabaseModule = TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
  dataSourceFactory: async (options: DataSourceOptions) => {
    return new DataSource(options).initialize();
  },
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        appConfig,
        mailConfig,
        fileConfig,
        facebookConfig,
        googleConfig,
      ],
      envFilePath: ['.env'],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const isProduction =
          configService.get('app.nodeEnv', { infer: true }) === 'production';
        return {
          pinoHttp: {
            autoLogging: true,
            redact: [
              'req.headers.authorization',
              'req.body.password',
              'req.body.token',
              'req.body.apiKey',
              'req.body.accessToken',
            ],
            genReqId: (req) =>
              (req.headers['x-request-id'] as string) || randomUUID(),
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: false },
                },
          },
        };
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: parseInt(process.env['RATE_LIMIT_TTL'] || '60', 10) * 1000,
          limit: parseInt(process.env['RATE_LIMIT_MAX'] || '120', 10),
        },
      ],
    }),
    infrastructureDatabaseModule,
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        fallbackLanguage: configService.getOrThrow('app.fallbackLanguage', {
          infer: true,
        }),
        loaderOptions: { path: path.join(__dirname, '/i18n/'), watch: true },
      }),
      resolvers: [
        {
          use: HeaderResolver,
          useFactory: (configService: ConfigService<AllConfigType>) => {
            return [
              configService.get('app.headerLanguage', {
                infer: true,
              }),
            ];
          },
          inject: [ConfigService],
        },
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
    }),
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      path: '/metrics',
    }),
    MetricsModule,
    UsersModule,
    FilesModule,
    AuthModule,
    AuthFacebookModule,
    AuthGoogleModule,
    SessionModule,
    MailModule,
    MailerModule,
    HomeModule,
    WorkersModule,
    ...(process.env.NODE_ENV !== 'production' ? [I18nTestModule] : []),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
