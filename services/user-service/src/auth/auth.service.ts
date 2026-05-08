import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { User } from '../users/user.entity';

interface PendingCode {
  access_token: string;
  role: string;
  expiresAt: number;
}

const CODE_TTL_MS = 60_000;

@Injectable()
export class AuthService {
  private readonly pendingCodes = new Map<string, PendingCode>();

  constructor(private readonly jwtService: JwtService) {}

  private signToken(user: User): { access_token: string; role: string } {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    return { access_token: this.jwtService.sign(payload), role: user.role };
  }

  generateCode(user: User): string {
    const { access_token, role } = this.signToken(user);
    const code = randomBytes(32).toString('hex');
    this.pendingCodes.set(code, { access_token, role, expiresAt: Date.now() + CODE_TTL_MS });
    for (const [k, v] of this.pendingCodes) {
      if (v.expiresAt < Date.now()) this.pendingCodes.delete(k);
    }
    return code;
  }

  exchangeCode(code: string): { access_token: string; role: string } {
    const entry = this.pendingCodes.get(code);
    if (!entry || entry.expiresAt < Date.now()) {
      this.pendingCodes.delete(code);
      throw new UnauthorizedException('Invalid or expired authorization code');
    }
    this.pendingCodes.delete(code);
    return { access_token: entry.access_token, role: entry.role };
  }
}
