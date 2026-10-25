import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Counter, CounterSchema } from '../common/database/counter.schema.js';
import { CounterService } from '../common/database/counter.service.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  providers: [UsersService, CounterService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
