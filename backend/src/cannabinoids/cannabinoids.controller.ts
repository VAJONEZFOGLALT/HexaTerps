import { Controller, Get } from '@nestjs/common';
import { CannabinoidsService } from './cannabinoids.service';

@Controller('api/cannabinoids')
export class CannabinoidsController {
  constructor(private readonly cannabinoidsService: CannabinoidsService) {}

  @Get()
  findAll() {
    return this.cannabinoidsService.findAll();
  }
}
