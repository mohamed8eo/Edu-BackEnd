import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from './dto/createUser.dto';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth/jwt-refresh-auth.guard';
import { CurrentUser } from './decorator/currentUser.decorator';
import type { JwtUser } from './types/jwtUser';
import { CurrentRefreshToken } from './decorator/userRefreshToken.decorator';
import { Public } from './decorator/Public.decorator';
import { GoogleAuthGuard } from './guards/google_auth/google_auth.guard';
import type { Request, Response } from 'express';
import { GithubAuthGuard } from './guards/github_auth/github_auth.guard';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('sign-up')
  async signUp(@Body() createUser: CreateUserDto) {
    return await this.authService.signUp(createUser);
  }

  @Public()
  @Post('login')
  async login(@Body() loginUser: LoginUserDto) {
    return await this.authService.login(loginUser);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('sign-out')
  async signOut(
    @CurrentUser() user: JwtUser,
    @CurrentRefreshToken() refresh_token: string,
  ) {
    return await this.authService.signOut(user, refresh_token);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async RefreshToken(
    @CurrentUser() user: JwtUser,
    @CurrentRefreshToken() refresh_token: string,
  ) {
    return await this.authService.RefreshToken(user, refresh_token);
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  async googleLogin() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as typeof user.$inferSelect;
    if (!user) {
      throw new UnauthorizedException('Google authentication failed');
    }
    const token = await this.authService.logInOAuthUser(user);
    res.redirect(`http://localhost:5000?token=${token.access_token}`);
  }

  @Public()
  @UseGuards(GithubAuthGuard)
  @Get('github/login')
  async githubLogin() {}

  @Public()
  @UseGuards(GithubAuthGuard)
  @Get('github/callback')
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as typeof user.$inferSelect;
    if (!user) {
      throw new UnauthorizedException(' Github authentication failed');
    }
    const token = await this.authService.logInOAuthUser(user);
    res.redirect(`http://localhost:5000?token=${token.access_token}`);
  }
}
