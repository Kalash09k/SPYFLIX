import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty() @IsString() subscriptionGroupId: string;
  @IsNotEmpty() @IsString() buyerId: string;
  @IsNotEmpty() @IsString() buyerWhatsApp: string; // +237...
}
