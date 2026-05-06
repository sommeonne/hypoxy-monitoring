import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { SpecializationsModule } from './specializations/specializations.module';
import { User } from './users/user.entity';
import { Specialization } from './specializations/specialization.entity';

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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USER', 'hypoxy'),
        password: config.get('DB_PASSWORD', 'hypoxy_password'),
        database: config.get('DB_NAME', 'hypoxy_db'),
        entities: [User, Specialization],
        synchronize: true,
        logging: config.get('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    HealthModule,
    UsersModule,
    SpecializationsModule,
  ],
})
export class AppModule {}
