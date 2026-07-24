import { HttpException, HttpStatus } from '@nestjs/common';

export class DomainException extends HttpException {
  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    error?: string,
  ) {
    super(
      {
        statusCode,
        message,
        error: error ?? 'Domain Error',
      },
      statusCode,
    );
  }
}
