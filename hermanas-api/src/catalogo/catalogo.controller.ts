import { Controller, Get } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';
import { Public } from '../auth/public.decorator';

// Único endpoint pensado para el público: @Public lo deja fuera del login.
@Public()
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  obtener() {
    return this.catalogoService.obtener();
  }
}
