import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto, LoginUserDto } from './dto/createUser.dto';
import * as argon2 from 'argon2';
import { db } from '../db';
import { refreshToken, user } from '../db/schema';
import { JwtAuthPaylod } from './types/jwtAuth';
import refreshTokenConfig from './config/refreshToken.config';
import type { ConfigType } from '@nestjs/config';
import { and, eq, gt } from 'drizzle-orm';
import type { JwtUser } from './types/jwtUser';
type DbUser = typeof user.$inferSelect;
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(refreshTokenConfig.KEY)
    private refreshToken: ConfigType<typeof refreshTokenConfig>,
  ) {}
  async signUp(createUser: CreateUserDto) {
    const { name, email, password } = createUser;
    const emailNormalized = email.trim().toLowerCase();
    const hashPassword = await argon2.hash(password);

    try {
      const [userInfo] = await db
        .insert(user)
        .values({
          name,
          email: emailNormalized,
          password: hashPassword,
        })
        .returning();

      const accessPayload: JwtAuthPaylod = {
        sub: userInfo.id,
        email: userInfo.email,
        type: 'access', // clearly marks this as access token
      };

      const refreshPayload: JwtAuthPaylod = {
        sub: userInfo.id,
        email: userInfo.email,
        type: 'refresh', // clearly marks this as refresh token
      };
      const { refresh_token, hashRefreshToken } =
        await this.generateRefreshToken(refreshPayload);

      //store refresh_token on db
      await db.insert(refreshToken).values({
        userId: userInfo.id,
        token: hashRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
      return {
        message: 'user CreateSuccessFully !',
        accessToken: this.access_token(accessPayload),
        refresh_token,
      };
    } catch (err: any) {
      // PostgreSQL unique violation
      const code = err.code ?? err?.cause?.code;
      if (code === '23505') {
        throw new ConflictException('Email already exists');
      }
      throw err;
    }
  }

  async login(loginUser: LoginUserDto) {
    const { email, password } = loginUser;

    const [isUserExist] = await db
      .select({
        userId: user.id,
        hashpassword: user.password,
      })
      .from(user)
      .where(eq(user.email, email));
    if (!isUserExist)
      throw new BadRequestException('Email or Password are en correct');

    const isEqual = await argon2.verify(isUserExist.hashpassword, password);
    if (!isEqual)
      throw new BadRequestException('Email or password are en corrct');

    await db
      .delete(refreshToken)
      .where(eq(refreshToken.userId, isUserExist.userId));
    //create Token

    const accessPayload: JwtAuthPaylod = {
      sub: isUserExist.userId,
      email: email,
      type: 'access', // clearly marks this as access token
    };

    const refreshPayload: JwtAuthPaylod = {
      sub: isUserExist.userId,
      email: email,
      type: 'refresh', // clearly marks this as refresh token
    };

    const { refresh_token, hashRefreshToken } =
      await this.generateRefreshToken(refreshPayload);

    await db.insert(refreshToken).values({
      userId: isUserExist.userId,
      token: hashRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken: this.access_token(accessPayload),
      refresh_token,
    };
  }

  async signOut(user: JwtUser, refreshTokenRaw: string) {
    const tokens = await db
      .select({
        id: refreshToken.id,
        token: refreshToken.token,
      })
      .from(refreshToken)
      .where(eq(refreshToken.userId, user.userId));

    if (!tokens.length) return;

    for (const tokenRecord of tokens) {
      const isMatch = await argon2.verify(tokenRecord.token, refreshTokenRaw);

      if (isMatch) {
        await db
          .delete(refreshToken)
          .where(eq(refreshToken.id, tokenRecord.id));
        break;
      }
    }

    return {
      message: 'Sign Out Successfully!',
    };
  }

  async validateGoogleUser(googleUser: CreateUserDto) {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, googleUser.email))
      .limit(1);

    if (existingUser) {
      return existingUser; // ✅ DB entity
    }

    // insert new user and return the DB entity
    const [newUser] = await db
      .insert(user)
      .values({
        name: googleUser.name,
        email: googleUser.email,
        password: '', // or random
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  }

  async validateGithubUser(githubUser: CreateUserDto) {
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, githubUser.email))
      .limit(1);

    if (existingUser) {
      return existingUser; // ✅ DB entity
    }

    // insert new user and return the DB entity
    const [newUser] = await db
      .insert(user)
      .values({
        name: githubUser.name,
        email: githubUser.email,
        password: '', // or random
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newUser;
  }
  async RefreshToken(user: JwtUser, refresh_token: string) {
    const now = new Date();
    const tokens = await db
      .select()
      .from(refreshToken)
      .where(
        and(
          eq(refreshToken.userId, user.userId),
          gt(refreshToken.expiresAt, now),
        ),
      );

    if (!tokens.length)
      throw new UnauthorizedException('No valid refresh token');

    let validRecord: (typeof tokens)[0] | undefined = undefined;

    for (const record of tokens) {
      const valid = await argon2.verify(record.token, refresh_token);
      if (valid) {
        validRecord = record;
        break;
      }
    }

    if (!validRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const msLeft = validRecord.expiresAt.getTime() - now.getTime();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);

    const accessPayload: JwtAuthPaylod = {
      sub: user.userId,
      email: user.email,
      type: 'access',
    };

    const access_token = this.access_token(accessPayload);

    // Rotate refresh token if less than 7 days until expiration
    if (daysLeft < 7) {
      const refreshPayload: JwtAuthPaylod = {
        sub: user.userId,
        email: user.email,
        type: 'refresh',
      };

      const { refresh_token: newRefreshToken, hashRefreshToken } =
        await this.generateRefreshToken(refreshPayload);

      // Delete old token and insert new one
      await db.delete(refreshToken).where(eq(refreshToken.id, validRecord.id));

      await db.insert(refreshToken).values({
        userId: user.userId,
        token: hashRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      return {
        access_token,
        refresh_token: newRefreshToken,
      };
    }

    return {
      access_token,
    };
  }

  async logInOAuthUser(user: DbUser) {
    const accessPayload: JwtAuthPaylod = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    const refreshPayload: JwtAuthPaylod = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    const { refresh_token, hashRefreshToken } =
      await this.generateRefreshToken(refreshPayload);

    await db.insert(refreshToken).values({
      userId: user.id,
      token: hashRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return {
      access_token: this.access_token(accessPayload),
      refresh_token,
    };
  }

  private access_token(payload: JwtAuthPaylod) {
    const access_token = this.jwtService.sign(payload);
    return access_token;
  }

  private async generateRefreshToken(payload: JwtAuthPaylod) {
    const refresh_token = this.jwtService.sign(payload, this.refreshToken);
    const hashRefreshToken = await argon2.hash(refresh_token);

    return {
      refresh_token,
      hashRefreshToken,
    };
  }
}
