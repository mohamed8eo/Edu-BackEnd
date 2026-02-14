import { Module, ValidationPipe, Injectable, Inject } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import {
  CacheModule,
  CacheModuleOptions,
  CACHE_MANAGER,
} from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import {
  seconds,
  ThrottlerGuard,
  ThrottlerModule,
  ThrottlerStorage,
} from '@nestjs/throttler';
import type { Cache } from 'cache-manager';
import { TrafficModule } from './traffic/traffic.module';
import { CategorieModule } from './categorie/categorie.module';
import { CourseModule } from './course/course.module';

// Custom Throttler Storage using Cache Manager
@Injectable()
class ThrottlerCacheStorage implements ThrottlerStorage {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const current = await this.cacheManager.get<number>(key);
    const totalHits = (current || 0) + 1;
    const timeToExpire = ttl;

    await this.cacheManager.set(key, totalHits, ttl);

    const isBlocked = totalHits > limit;
    const timeToBlockExpire = isBlocked ? blockDuration : 0;

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UserModule,
    TrafficModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (): CacheModuleOptions => ({
        store: redisStore,
        url: process.env.REDIS_URL,
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: seconds(60), // 60 seconds in milliseconds
          limit: 100,
        },
      ],
    }),
    CategorieModule,
    CourseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
    ThrottlerCacheStorage,
    {
      provide: 'THROTTLER_STORAGE',
      useClass: ThrottlerCacheStorage,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
