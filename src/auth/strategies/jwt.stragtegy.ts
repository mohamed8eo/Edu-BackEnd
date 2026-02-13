import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import accessTokenConfig from '../config/accessToken.config';
import type { ConfigType } from '@nestjs/config';
import { JwtAuthPaylod } from '../types/jwtAuth';

@Injectable()
export class JwtAccesstoken extends PassportStrategy(Strategy, 'accessToken') {
  constructor(
    @Inject(accessTokenConfig.KEY)
    jwtAceesstoken: ConfigType<typeof accessTokenConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtAceesstoken.secret as string,
      ignoreExpiration: false,
    });
  }

  validate(payload: JwtAuthPaylod) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
