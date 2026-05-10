import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { ProxyMiddleware } from './proxy/proxy.middleware';
import { WebsocketModule } from './websocket/websocket.module';

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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 200 }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'secret'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '24h') },
      }),
    }),
    HealthModule,
    WebsocketModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProxyMiddleware).forRoutes(
      { path: 'api/auth*', method: RequestMethod.ALL },
      { path: 'api/users*', method: RequestMethod.ALL },
      { path: 'api/specializations*', method: RequestMethod.ALL },
      { path: 'api/devices*', method: RequestMethod.ALL },
      { path: 'api/patients*', method: RequestMethod.ALL },
      { path: 'api/groups*', method: RequestMethod.ALL },
      { path: 'api/analysis*', method: RequestMethod.ALL },
      { path: 'api/alerts*', method: RequestMethod.ALL },
      { path: 'api/sessions*', method: RequestMethod.ALL },
      { path: 'api/reports*', method: RequestMethod.ALL },
    );
  }
}
