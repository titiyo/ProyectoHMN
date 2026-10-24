import { SetMetadata } from '@nestjs/common';

// Marca una ruta (o un controller entero) como pública: el AuthGuard la deja pasar sin token.
// Uso: @Public() arriba del método o de la clase.
export const ES_PUBLICA = 'esPublica';
export const Public = () => SetMetadata(ES_PUBLICA, true);
