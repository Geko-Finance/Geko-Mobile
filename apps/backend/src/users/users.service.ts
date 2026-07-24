import { Injectable } from '@nestjs/common';
import { UserNotFoundException } from '../shared/exceptions/user-not-found.exception';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRecord, UsersRepository } from './users.repository';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return this.toProfile(user);
  }

  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<UserProfile> {
    const existing = await this.usersRepository.findById(userId);

    if (!existing) {
      throw new UserNotFoundException(userId);
    }

    const user = await this.usersRepository.update(userId, dto);
    return this.toProfile(user);
  }

  private toProfile(user: UserRecord): UserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }
}
