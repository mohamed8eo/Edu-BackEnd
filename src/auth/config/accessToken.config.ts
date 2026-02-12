import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs(
  'accessToken',
  (): JwtModuleOptions => ({
    secret: process.env.JWT_ACCESS_SECRET,
    signOptions: {
      expiresIn: Number(process.env.JWT_ACCESS_TOKEN_EXPIRATION),
    },
  }),
);
