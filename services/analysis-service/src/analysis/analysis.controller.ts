import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { Measurement, AnalysisResult, ConcludeRequest, ConcludeResponse } from './thresholds';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  private requireDoctor(role: string): void {
    if (role !== 'doctor') throw new ForbiddenException('Access restricted to doctors');
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Manually analyze a measurement' })
  @ApiBody({ description: 'Measurement data' })
  analyze(
    @Body() measurement: Measurement,
    @Headers('x-user-role') role: string,
  ): Promise<AnalysisResult> {
    this.requireDoctor(role);
    return this.analysisService.analyze(measurement);
  }

  @Post('conclude')
  @ApiOperation({ summary: 'Compute hypoxia tolerance conclusion for a completed session' })
  @ApiBody({ description: 'Final and first measurement values with optional patient baselines' })
  conclude(
    @Body() req: ConcludeRequest,
    @Headers('x-user-role') role: string,
  ): ConcludeResponse {
    this.requireDoctor(role);
    return this.analysisService.computeConclusion(req);
  }
}
