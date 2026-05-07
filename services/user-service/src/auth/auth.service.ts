import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  googleLogin(user: User): { access_token: string; role: string } {
    const payload = { sub: user.id, username: user.username, role: user.role, firstName: user.firstName, lastName: user.lastName };
    return {
      access_token: this.jwtService.sign(payload),
      role: user.role,
    };
  }
}
