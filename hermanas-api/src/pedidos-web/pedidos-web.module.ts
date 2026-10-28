import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosWebController } from './pedidos-web.controller';
import { PedidosWebService } from './pedidos-web.service';
import { DetallePedidoWeb, PedidoWeb } from './entities/pedido-web.entity';
import { Ajuste } from './entities/ajuste.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PedidoWeb, DetallePedidoWeb, Ajuste])],
  controllers: [PedidosWebController],
  providers: [PedidosWebService],
})
export class PedidosWebModule {}
