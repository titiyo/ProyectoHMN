import { EntityManager } from 'typeorm';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';

// Renglón ya calculado (cantidad en unidades, precio y presentación copiados).
export type RenglonVenta = Pick<
  DetalleVenta,
  | 'variedadId'
  | 'presentacionId'
  | 'presentacionNombre'
  | 'unidadesPorPresentacion'
  | 'cantidad'
  | 'precioUnitario'
  | 'subtotal'
>;

// Guarda la cabecera y los renglones dentro de la transacción que se le pase.
// La usan la venta de mostrador y la entrega de un encargue.
export async function guardarVenta(
  manager: EntityManager,
  renglones: RenglonVenta[],
  cliente: string | null,
  encargueId: number | null = null,
): Promise<number> {
  const total = renglones.reduce((suma, r) => suma + r.subtotal, 0);
  const venta = await manager.save(Venta, { total, cliente, encargueId });
  await manager.save(
    DetalleVenta,
    renglones.map((r) => ({ ...r, ventaId: venta.id })),
  );
  return venta.id;
}
