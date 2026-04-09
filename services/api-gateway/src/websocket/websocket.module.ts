import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { RedisRelayService } from './redis-relay.service';

@Module({
  providers: [EventsGateway, RedisRelayService],
})
export class WebsocketModule {}
