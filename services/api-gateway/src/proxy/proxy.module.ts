import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ProxyMiddleware } from './proxy.middleware';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'secret'),
      }),
    }),
  ],
  providers: [ProxyMiddleware],
  exports: [ProxyMiddleware],
})
export class ProxyModule {}
