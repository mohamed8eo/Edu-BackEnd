import { IsEmail, IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name: string;

  @IsString()
  @IsUrl()
  @IsOptional()
  image: string;

  @IsString()
  @IsOptional()
  @Length(2, 13)
  bio: string;

  @IsEmail()
  @IsOptional()
  email: string;
}
