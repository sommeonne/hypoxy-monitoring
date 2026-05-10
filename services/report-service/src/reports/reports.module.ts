import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DataFetcherService } from './data-fetcher.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { EmailService } from './email.service';
import { Report } from './report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report])],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    DataFetcherService,
    PdfGeneratorService,
    ExcelGeneratorService,
    EmailService,
  ],
})
export class ReportsModule {}
