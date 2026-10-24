import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncarguesController } from './encargues.controller';
import { EncarguesService } from './encargues.service';
import { Encargue } from './entities/encargue.entity';
import { DetalleEncargue } from './entities/detalle-encargue.entity';
import { Variedad } from '../variedades/entities/variedad.entity';
import { Presentacion } from '../presentaciones/entities/presentacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Encargue, DetalleEncargue, Variedad, Presentacion])],
  controllers: [EncarguesController],
  providers: [EncarguesService],
})
export class EncarguesModule {}
