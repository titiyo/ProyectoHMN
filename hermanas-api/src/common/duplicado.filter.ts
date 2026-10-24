import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

// Filtro global para los errores que tira la base de datos.
// Los servicios ya chequean nombres repetidos antes de guardar, pero si llegan dos
// altas iguales al mismo tiempo, las dos pasan el chequeo y la segunda la frena la
// restricción UNIQUE de Postgres. Sin este filtro eso sería un 500 ("error interno");
// con él es un 409 entendible, igual que el chequeo normal.
@Catch(QueryFailedError)
export class DuplicadoFilter implements ExceptionFilter {
  private readonly logger = new Logger('BaseDeDatos');

  catch(error: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    // 23505 = unique_violation en Postgres.
    if (error.code === '23505') {
      res.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya existe un registro con ese nombre.',
      });
      return;
    }
    // Cualquier otro error de la base: se registra y se responde 500 como siempre,
    // sin mostrarle al cliente el detalle de SQL.
    this.logger.error(error.message);
    res.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
