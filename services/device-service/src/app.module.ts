import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { LoggerModule } from 'nestjs-pino';
import { MeasurementsModule } from './measurements/measurements.module';
import { Measurement } from './measurements/measurement.entity';
import { HealthModule } from './health/health.module';
import { RolesGuard } from './common/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({ context: 'HTTP' }),
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'hypoxy'),
        password: config.get('DB_PASSWORD', 'hypoxy_password'),
        database: config.get('DB_NAME', 'hypoxy_db'),
        entities: [Measurement],
        synchronize: true,
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const { redisStore } = await import('cache-manager-redis-yet');
        return {
          store: await redisStore({
            socket: {
              host: config.get('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 6379),
            },
          }),
          ttl: 300_000,
        };
      },
    }),
    MeasurementsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
