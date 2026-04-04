import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { Measurement, AnalysisResult } from './thresholds';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Manually analyze a measurement' })
  @ApiBody({ description: 'Measurement data' })
  analyze(@Body() measurement: Measurement): Promise<AnalysisResult> {
    return this.analysisService.analyze(measurement);
  }
}
