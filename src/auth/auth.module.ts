import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import accessTokenConfig from './config/accessToken.config';
import { ConfigModule } from '@nestjs/config';
import refreshTokenConfig from './config/refreshToken.config';
import { JwtAccesstoken } from './strategies/jwt.stragtegy';
import { JwtRefreshToken } from './strategies/refreshJwt.strategy';
import { APP_GUARD } from '@nestjs/core';
import { JwtAccessAuthGuard } from './guards/jwt-access-auth/jwt-access-auth.guard';
import googleAuthConfig from './config/googleAuth.config';
import { GoogleStrategy } from './strategies/googleAuth.strategy';
import githubAuthConfig from './config/githubAuth.config';
import { GithubStrategy } from './strategies/githubAuth.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync(accessTokenConfig.asProvider()),
    ConfigModule.forFeature(accessTokenConfig),
    ConfigModule.forFeature(refreshTokenConfig),
    ConfigModule.forFeature(googleAuthConfig),
    ConfigModule.forFeature(githubAuthConfig),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccesstoken,
    JwtRefreshToken,
    GoogleStrategy,
    GithubStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAccessAuthGuard,
    },
  ],
})
export class AuthModule {}
