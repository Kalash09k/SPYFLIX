import { Controller, Get, Param, Body, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { BadRequestException } from '@nestjs/common';

@Controller('users')
export class UsersController {

    constructor(private readonly usersService: UsersService) { }

    @Get('wallet/:phone')
    // 💡 Moved getWallet implementation here, as it was outside the class structure.
    async getWallet(@Param('phone') phone: string) {
        if (!phone) {
            // Note: @Param generally ensures 'phone' exists, but a check is okay.
            throw new BadRequestException('Phone parameter is required.');
        }

        const wallet = await this.usersService.getWallet(phone);

        if (!wallet) {
            // Consider using NotFoundException if the resource is missing
            throw new BadRequestException(`Wallet not found for phone: ${phone}`); 
        }

        return wallet;
    }

    @Post('withdraw')
    async requestWithdraw(@Body() body: { phone: string; amount: number }) {
        // This will still show an error until you perform FIX 3 below!
        return this.usersService.requestWithdraw(body.phone, body.amount); 
    }
}