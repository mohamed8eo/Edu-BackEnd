import { IsEmail, IsNotEmpty, IsString, IsUrl, Length } from 'class-validator';

export class CreateUserOAuthDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsUrl()
  image?: string;

  @IsString()
  @Length(4, 12)
  @IsNotEmpty()
  password: string;
}
