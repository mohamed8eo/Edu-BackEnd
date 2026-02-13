import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  bio: string;
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(4, 12)
  @IsNotEmpty()
  password: string;
}
export class LoginUserDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(4, 12)
  @IsNotEmpty()
  password: string;
}
