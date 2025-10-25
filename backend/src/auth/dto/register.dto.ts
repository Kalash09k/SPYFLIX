import { IsEmail, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty() @IsString() name: string;
  @IsEmail() email: string;
  @IsNotEmpty() @IsString() phone: string;
  @IsNotEmpty() @IsString() password: string;
  @IsIn(['OWNER','BUYER']) role: 'OWNER' | 'BUYER';
}
