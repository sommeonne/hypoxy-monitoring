import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { Measurement, AnalysisResult, ConcludeRequest, ConcludeResponse } from './thresholds';

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

  @Post('conclude')
  @ApiOperation({ summary: 'Compute hypoxia tolerance conclusion for a completed session' })
  @ApiBody({ description: 'Final and first measurement values with optional patient baselines' })
  conclude(@Body() req: ConcludeRequest): ConcludeResponse {
    return this.analysisService.computeConclusion(req);
  }
}
