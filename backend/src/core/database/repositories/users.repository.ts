import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { users } from '../schema/users';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../drizzle.service';
import { MESSAGES } from '../../../common/constants/string-const';

export interface CreateUserDto {
  id?: string; // UUID id (optional, will be auto-generated if not provided)
}

export interface UpdateUserDto {
  // User table only has id, createdAt, updatedAt - no other fields to update
}

export interface UserEntity {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  constructor(drizzleService: DrizzleService) {
    super(drizzleService);
  }

  //#region ==================== CRUD OPERATIONS ====================

  async create(userData: CreateUserDto): Promise<UserEntity> {
    this.logger.log('Creating new user');

    try {
      const result = await this.db
        .insert(users)
        .values({
          id: userData.id, // Use provided UUID or let DB generate one
        })
        .returning();

      this.logger.log(`User created successfully (ID: ${result[0].id})`);
      return result[0] as UserEntity;
    } catch (error) {
      this.logger.error('Failed to create user', error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<UserEntity | null> {
    this.logger.log(`Finding user by ID: ${id}`);
    const result = await this.findOne(users, eq(users.id, id));
    if (result) {
      this.logger.log(`User found (ID: ${id})`);
    } else {
      this.logger.log(`User not found with ID: ${id}`);
    }
    return result;
  }

  async findByIdOrThrow(id: string): Promise<UserEntity> {
    return super.findByIdOrThrow(users, id, MESSAGES.USER_NOT_FOUND);
  }

  async update(id: string, userData: UpdateUserDto): Promise<UserEntity> {
    this.logger.log(`Updating user: ${id}`);

    try {
      const updateData: any = {
        updatedAt: new Date(),
      };

      const result = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (!result.length) {
        this.logger.warn(`User not found for update: ${id}`);
        throw new Error(MESSAGES.USER_NOT_FOUND);
      }

      this.logger.log(`User updated successfully: ${id}`);
      return result[0] as UserEntity;
    } catch (error) {
      this.logger.error(`Failed to update user: ${id}`, error.stack);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.logger.log(`Deleting user: ${id}`);

    try {
      const result = await this.db
        .delete(users)
        .where(eq(users.id, id))
        .returning();

      if (!result.length) {
        this.logger.warn(`User not found for deletion: ${id}`);
        throw new Error(MESSAGES.USER_NOT_FOUND);
      }

      this.logger.log(`User deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete user: ${id}`, error.stack);
      throw error;
    }
  }

  //#endregion

  //#region ==================== UTILITY OPERATIONS ====================

  async getAllUsers(): Promise<UserEntity[]> {
    this.logger.log('Fetching all users');
    try {
      const userList = await this.db.select().from(users);
      this.logger.log(`Retrieved ${userList.length} users`);
      return userList;
    } catch (error) {
      this.logger.error('Failed to fetch all users', error.stack);
      throw error;
    }
  }

  async getUsersCount(): Promise<number> {
    this.logger.log('Counting total users');
    return this.count(users);
  }

  //#endregion
}
