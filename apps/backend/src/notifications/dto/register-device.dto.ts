import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsOptional()
  @IsString()
  pushToken?: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}
