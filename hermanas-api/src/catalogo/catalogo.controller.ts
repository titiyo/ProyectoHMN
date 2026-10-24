import { Controller, Get } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';

// Único endpoint pensado para el público (en la Etapa 6 queda fuera del login).
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogoService: CatalogoService) {}

  @Get()
  obtener() {
    return this.catalogoService.obtener();
  }
}
