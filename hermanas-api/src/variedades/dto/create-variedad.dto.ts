// Precio propio para una presentación. precio null = borrar el propio (usar el de la categoría).
export class PrecioPropioDto {
  presentacionId!: number;
  precio!: number | null;
}

export class CreateVariedadDto {
  nombre!: string;
  categoriaId!: number;
  porEncargue?: boolean | null; // null = hereda de la categoría
  stock?: number;
  visible?: boolean;
  precios?: PrecioPropioDto[];
}
