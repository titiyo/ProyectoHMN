import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Categoria } from '../categorias/entities/categoria.entity';
import { Variedad } from '../variedades/entities/variedad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Categoria, Variedad])],
  providers: [SeedService],
})
export class SeedModule {}
