import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty() @IsString() subscriptionGroupId: string;
  @IsNotEmpty() @IsString() buyerId: string;
  @IsNotEmpty() @IsString() buyerWhatsApp: string; // +237...
  @IsNotEmpty() @IsString() amount: number;
   @IsNotEmpty() @IsString() subscriptionId: string;
}
