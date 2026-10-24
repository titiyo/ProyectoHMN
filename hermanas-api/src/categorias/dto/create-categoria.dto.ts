// Presentación que se crea junto con la categoría (solo en el alta).
export class PresentacionInicialDto {
  nombre!: string;
  unidades!: number;
  precio?: number | null;
}

export class CreateCategoriaDto {
  nombre!: string;
  porEncargue?: boolean;
  nota?: string | null;
  // Al menos una: una categoría sin presentaciones no se puede vender.
  presentaciones?: PresentacionInicialDto[];
}
