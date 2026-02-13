import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import refreshTokenConfig from '../config/refreshToken.config';
import type { ConfigType } from '@nestjs/config';
import { JwtAuthPaylod } from '../types/jwtAuth';

@Injectable()
export class JwtRefreshToken extends PassportStrategy(
  Strategy,
  'refreshToken',
) {
  constructor(
    @Inject(refreshTokenConfig.KEY)
    jwtAceesstoken: ConfigType<typeof refreshTokenConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtAceesstoken.secret as string,
      ignoreExpiration: false,
    });
  }
  validate(payload: JwtAuthPaylod): unknown {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
