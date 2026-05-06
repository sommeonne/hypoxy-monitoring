import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Specialization } from './specialization.entity';
import { SpecializationsService } from './specializations.service';
import { SpecializationsController } from './specializations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Specialization])],
  controllers: [SpecializationsController],
  providers: [SpecializationsService],
})
export class SpecializationsModule {}
