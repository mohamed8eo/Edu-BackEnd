import { Body, Controller, Get, Patch, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from 'src/auth/decorator/currentUser.decorator';
import type { JwtUser } from 'src/auth/types/jwtUser';
import { UpdateUserDto } from './dto/updateUser.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /*
   * User Can Do =>
   * Update her Profile Image, Name
   */

  @Get('me')
  async getUserAccount(@CurrentUser() user: JwtUser) {
    return await this.userService.getUserAccount(user.userId);
  }

  @Patch('me/update')
  async updateUserAccount(
    @CurrentUser() user: JwtUser,
    @Body() updateUser: UpdateUserDto,
  ) {
    return await this.userService.updateUserAccount(user.userId, updateUser);
  }
}
