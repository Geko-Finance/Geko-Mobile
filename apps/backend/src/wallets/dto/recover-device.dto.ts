import { IsString } from 'class-validator';

export class RecoverDeviceDto {
  @IsString()
  recoveryCode!: string;
}
