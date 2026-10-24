import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../services/stock.service';
import { AvisosService } from '../../services/avisos.service';
import { Categoria, Variedad } from '../../models';

type BorradorCategoria = Pick<Categoria, 'nombre' | 'porEncargue' | 'precioUnidad' | 'precioDocena'>;
type BorradorVariedad = Pick<Variedad, 'nombre' | 'categoriaId' | 'precioUnidad' | 'precioDocena' | 'visible'>;

// Categorías, precios y variedades.
// Cada fila se edita sobre un "borrador" (una copia): lo que se tipea no toca la lista
// real hasta apretar Guardar, y si la API devuelve error la lista sigue como estaba.
@Component({
  selector: 'app-configuracion',
  imports: [FormsModule],
  templateUrl: './configuracion.html',
})
export class Configuracion {
  private stock = inject(StockService);
  private avisos = inject(AvisosService);

  protected categorias = this.stock.categorias;
  protected grupos = this.stock.porCategoria;

  private borradoresCat: Record<number, BorradorCategoria> = {};
  private borradoresVar: Record<number, BorradorVariedad> = {};

  protected nuevaCategoria = this.categoriaVacia();
  protected nuevaVariedad = this.variedadVacia();

  // ??= crea la copia la primera vez que se pide y después devuelve siempre la misma.
  borradorCat(c: Categoria) {
    return (this.borradoresCat[c.id] ??= {
      nombre: c.nombre,
      porEncargue: c.porEncargue,
      precioUnidad: c.precioUnidad,
      precioDocena: c.precioDocena,
    });
  }

  borradorVar(v: Variedad) {
    return (this.borradoresVar[v.id] ??= {
      nombre: v.nombre,
      categoriaId: v.categoriaId,
      precioUnidad: v.precioUnidad,
      precioDocena: v.precioDocena,
      visible: v.visible,
    });
  }

  // Un input numérico vacío llega como null; eso significa "sin precio propio".
  guardarCategoria(c: Categoria) {
    this.stock.editarCategoria(c.id, this.borradorCat(c)).subscribe({
      next: () => {
        delete this.borradoresCat[c.id];
        this.avisos.exito(`Categoría "${c.nombre}" guardada.`);
      },
      error: (err) => this.avisos.error(err),
    });
  }

  eliminarCategoria(c: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    this.stock.eliminarCategoria(c.id).subscribe({
      next: () => this.avisos.exito('Categoría eliminada.'),
      error: (err) => this.avisos.error(err),
    });
  }

  crearCategoria() {
    this.stock.crearCategoria(this.nuevaCategoria).subscribe({
      next: (c) => {
        this.avisos.exito(`Categoría "${c.nombre}" creada.`);
        this.nuevaCategoria = this.categoriaVacia();
      },
      error: (err) => this.avisos.error(err),
    });
  }

  guardarVariedad(v: Variedad) {
    this.stock.editarVariedad(v.id, this.borradorVar(v)).subscribe({
      next: () => {
        delete this.borradoresVar[v.id];
        this.avisos.exito(`"${v.nombre}" guardada.`);
      },
      error: (err) => this.avisos.error(err),
    });
  }

  // Si ya tiene ventas la API responde 409 con el consejo de ocultarla; el aviso lo muestra.
  eliminarVariedad(v: Variedad) {
    if (!confirm(`¿Eliminar "${v.nombre}"?`)) return;
    this.stock.eliminarVariedad(v.id).subscribe({
      next: () => this.avisos.exito('Variedad eliminada.'),
      error: (err) => this.avisos.error(err),
    });
  }

  crearVariedad() {
    this.stock.crearVariedad(this.nuevaVariedad).subscribe({
      next: (v) => {
        this.avisos.exito(`"${v.nombre}" agregada.`);
        this.nuevaVariedad = this.variedadVacia();
      },
      error: (err) => this.avisos.error(err),
    });
  }

  private categoriaVacia(): BorradorCategoria {
    return { nombre: '', porEncargue: false, precioUnidad: null, precioDocena: null };
  }

  private variedadVacia(): BorradorVariedad & { stock: number } {
    return { nombre: '', categoriaId: 0, precioUnidad: null, precioDocena: null, visible: true, stock: 0 };
  }
}
