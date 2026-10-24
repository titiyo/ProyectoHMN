export class CreateCategoriaDto {
  nombre!: string;
  porEncargue?: boolean;
  precioUnidad?: number | null;
  precioDocena?: number | null;
}
