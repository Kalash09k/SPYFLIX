import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../orders/entities/user.entity';
import { PayoutModule } from '../payments/payout.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), PayoutModule  
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}