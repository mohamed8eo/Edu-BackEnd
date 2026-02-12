import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from 'src/db';
import { user } from 'src/db/schema';
import { UpdateUserDto } from './dto/updateUser.dto';

@Injectable()
export class UserService {
  async getUserAccount(userId: string) {
    const [UserAccount] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!UserAccount) throw new NotFoundException('user Not Existing');

    return {
      UserAccount,
    };
  }
  async updateUserAccount(userId: string, updateUser: UpdateUserDto) {
    try {
      // Prepare update data
      const updateData: Partial<typeof user.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (updateUser.name) updateData.name = updateUser.name.trim();
      if (updateUser.email)
        updateData.email = updateUser.email.trim().toLowerCase();
      if (updateUser.image) updateData.image = updateUser.image;

      // Check if there's anything to update
      if (Object.keys(updateData).length === 1) {
        throw new BadRequestException('No fields to update');
      }

      // Update user
      const [updatedUser] = await db
        .update(user)
        .set(updateData)
        .where(eq(user.id, userId))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        });

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return {
        message: 'User updated successfully',
        user: updatedUser,
      };
    } catch (err: any) {
      // Handle unique constraint violation for email
      const code = err.code ?? err?.cause?.code;
      if (code === '23505') {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }
}
