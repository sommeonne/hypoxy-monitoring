import { Controller, Get, Post, Body, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { IsString, IsNotEmpty } from 'class-validator';
import { Response } from 'express';
import { AuthService } from './auth.service';

class ExchangeCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  googleAuth() {
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback — redirects with a one-time code, never the JWT' })
  googleCallback(@Req() req: any, @Res() res: Response) {
    if (!req.user) throw new UnauthorizedException();
    const code = this.authService.generateCode(req.user);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
  }

  @Post('exchange')
  @ApiOperation({ summary: 'Exchange a one-time code for a JWT' })
  exchange(@Body() dto: ExchangeCodeDto): { access_token: string; role: string } {
    return this.authService.exchangeCode(dto.code);
  }
}
