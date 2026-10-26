import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CountersService } from '../common/counters/counters.service.js';
import { User, type UserDocument, type UserRole } from './schemas/user.schema.js';

export interface SafeUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly counters: CountersService,
  ) {}

  toSafeUser(user: Pick<User, 'id' | 'email' | 'name' | 'role'>): SafeUser {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async create(input: { email: string; name: string; passwordHash: string }): Promise<SafeUser> {
    const email = this.normalizeEmail(input.email);
    if (await this.userModel.exists({ email })) {
      throw new ConflictException('An account with this email already exists');
    }
    const id = await this.counters.next('users');
    try {
      const user = await this.userModel.create({
        id,
        email,
        name: input.name.trim(),
        passwordHash: input.passwordHash,
        role: 'User',
      });
      return this.toSafeUser(user);
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: this.normalizeEmail(email) }).exec();
  }

  async findByEmailForLogin(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: this.normalizeEmail(email) }).select('+passwordHash').exec();
  }

  async findById(id: number): Promise<UserDocument | null> {
    return this.userModel.findOne({ id }).exec();
  }

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isDuplicateKey(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
  }
}
