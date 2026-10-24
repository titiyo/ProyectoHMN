import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresentacionesController } from './presentaciones.controller';
import { PresentacionesService } from './presentaciones.service';
import { Presentacion } from './entities/presentacion.entity';
import { Categoria } from '../categorias/entities/categoria.entity';
import { DetalleEncargue } from '../encargues/entities/detalle-encargue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Presentacion, Categoria, DetalleEncargue])],
  controllers: [PresentacionesController],
  providers: [PresentacionesService],
})
export class PresentacionesModule {}
