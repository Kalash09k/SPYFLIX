import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService]
})
export class AuthModule {}
