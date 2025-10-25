import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth) throw new UnauthorizedException();
    const token = auth.replace('Bearer ', '');
    try {
      const payload: any = jwt.verify(token, process.env.JWT_SECRET);
      const user = await this.prisma.user.findUnique({ where: { id: payload.userId }});
      if (!user) throw new UnauthorizedException();
      req.user = user;
      return true;
    } catch (e) {
      throw new UnauthorizedException();
    }
  }
}
