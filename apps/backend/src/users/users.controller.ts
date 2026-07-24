import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../shared/types/authenticated-request';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.sub);
  }

  @Patch('me')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }
}
