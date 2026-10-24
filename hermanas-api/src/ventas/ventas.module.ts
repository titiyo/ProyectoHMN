import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { Encargue } from '../encargues/entities/encargue.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venta, DetalleVenta, Encargue, DetalleEncargue]),
  ],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
