import { IsNotEmpty, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @IsString()
  @IsNotEmpty()
  authData!: string;
}
