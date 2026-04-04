import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AlertsHttpService } from './alerts-http.service';
import { RedisSubscriberService } from './redis-subscriber.service';

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService, AlertsHttpService, RedisSubscriberService],
})
export class AnalysisModule {}
