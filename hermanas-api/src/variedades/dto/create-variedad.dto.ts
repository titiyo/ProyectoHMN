export class CreateVariedadDto {
  nombre!: string;
  categoriaId!: number;
  precioUnidad?: number | null;
  precioDocena?: number | null;
  stock?: number;
  visible?: boolean;
}
