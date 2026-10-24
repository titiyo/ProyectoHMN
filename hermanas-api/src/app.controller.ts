import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Público: Render lo usa para chequear que la API está viva.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
