import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AlertsHttpService } from './alerts-http.service';
import { RedisSubscriberService } from './redis-subscriber.service';
import { RedisPublisherService } from './redis-publisher.service';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, AlertsHttpService, RedisSubscriberService, RedisPublisherService],
})
export class AnalysisModule {}
