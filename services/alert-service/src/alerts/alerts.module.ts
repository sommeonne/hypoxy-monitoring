import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alert } from './alert.entity';
import { RedisModule } from '../redis/redis.module';
import { RedisSubscriberService } from '../redis/redis-subscriber.service';

@Module({
  imports: [TypeOrmModule.forFeature([Alert]), RedisModule],
  controllers: [AlertsController],
  providers: [AlertsService, RedisSubscriberService],
})
export class AlertsModule {}
