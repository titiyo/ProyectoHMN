import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariedadesController } from './variedades.controller';
import { VariedadesService } from './variedades.service';
import { Variedad } from './entities/variedad.entity';
import { PrecioVariedad } from './entities/precio-variedad.entity';
import { CategoriasModule } from '../categorias/categorias.module';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';

@Module({
  // DetalleVenta y DetalleEncargue solo para contar usos antes de borrar una variedad.
  imports: [
    TypeOrmModule.forFeature([Variedad, PrecioVariedad, DetalleVenta, DetalleEncargue]),
    CategoriasModule,
  ],
  controllers: [VariedadesController],
  providers: [VariedadesService],
  exports: [VariedadesService],
})
export class VariedadesModule {}
