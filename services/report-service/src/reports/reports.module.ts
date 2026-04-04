import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DataFetcherService } from './data-fetcher.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, DataFetcherService, PdfGeneratorService, ExcelGeneratorService],
})
export class ReportsModule {}
