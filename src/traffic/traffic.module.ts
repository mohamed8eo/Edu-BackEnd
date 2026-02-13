import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TrafficMiddleware } from './traffic.middleware';
import { TrafficService } from './traffic.service';
import { TrafficController } from './traffic.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  providers: [TrafficService],
  controllers: [TrafficController],
  exports: [TrafficService],
})
export class TrafficModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TrafficMiddleware).forRoutes('*');
  }
}
