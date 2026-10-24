import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VariedadesController } from './variedades.controller';
import { VariedadesService } from './variedades.service';
import { Variedad } from './entities/variedad.entity';
import { CategoriasModule } from '../categorias/categorias.module';
import { DetalleVenta } from '../ventas/entities/detalle-venta.entity';

@Module({
  // DetalleVenta solo para contar ventas antes de borrar una variedad.
  imports: [TypeOrmModule.forFeature([Variedad, DetalleVenta]), CategoriasModule],
  controllers: [VariedadesController],
  providers: [VariedadesService],
  exports: [VariedadesService],
})
export class VariedadesModule {}
