import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { ThrottlerModule, seconds } from '@nestjs/throttler';
import { SpeechModule } from './speech/speech.module';
import { DictationModule } from './practice/dictation/dictation.module';
import { AuthModule } from './auth/auth.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { LessonModule } from './lesson/lesson.module';
import { PaymentModule } from './payment/payment.module';
import { ShadowingModule } from './practice/shadowing/shadowing.module';
import { LearningModule } from './learning/learning.module';
import { SystemConfigModule } from './system-config/system-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: seconds(60),
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        ...(config.get<string>('DATABASE_URL')
          ? { url: config.get<string>('DATABASE_URL') }
          : {
              host: config.get<string>('DB_HOST', 'localhost'),
              port: Number(config.get<string>('DB_PORT', '5432')),
              username: config.get<string>('DB_USERNAME'),
              password: config.get<string>('DB_PASSWORD'),
              database: config.get<string>('DB_DATABASE', 'shadowtation'),
            }),
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        uuidExtension: 'pgcrypto' as const,
        synchronize: false,
        extra: {
          max: 15,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
    SpeechModule,
    DictationModule,
    ShadowingModule,
    LearningModule,
    AuthModule,
    SubscriptionModule,
    LessonModule,
    PaymentModule,
    SystemConfigModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
