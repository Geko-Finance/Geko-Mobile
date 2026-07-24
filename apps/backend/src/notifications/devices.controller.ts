import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UserDevicesRepository } from './repositories/user-devices.repository';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(
    private readonly userDevicesRepository: UserDevicesRepository,
  ) {}

  @Post()
  async register(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RegisterDeviceDto,
  ) {
    await this.userDevicesRepository.upsert(req.user.sub, dto);
    return { ok: true };
  }
}
