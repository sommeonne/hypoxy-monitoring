import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { RedisModule } from '../redis/redis.module';
import { RedisSubscriberService } from '../redis/redis-subscriber.service';

@Module({
  imports: [RedisModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, RedisSubscriberService],
})
export class AnalysisModule {}
