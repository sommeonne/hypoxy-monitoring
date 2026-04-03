import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';
import { MeasurementsGateway } from './measurements.gateway';
import { Measurement } from './measurement.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Measurement]), RedisModule],
  controllers: [MeasurementsController],
  providers: [MeasurementsService, MeasurementsGateway],
})
export class MeasurementsModule {}
