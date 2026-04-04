import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { DoctorsModule } from './doctors/doctors.module';
import { Doctor } from './doctors/doctor.entity';
import { ProxyMiddleware } from './proxy/proxy.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        customProps: () => ({ context: 'HTTP' }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'secret'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '24h') },
      }),
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
        entities: [Doctor],
        synchronize: true,
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    HealthModule,
    DoctorsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProxyMiddleware).forRoutes(
      { path: 'api/devices*', method: RequestMethod.ALL },
      { path: 'api/patients*', method: RequestMethod.ALL },
      { path: 'api/analysis*', method: RequestMethod.ALL },
      { path: 'api/alerts*', method: RequestMethod.ALL },
      { path: 'api/sessions*', method: RequestMethod.ALL },
      { path: 'api/reports*', method: RequestMethod.ALL },
    );
  }
}
