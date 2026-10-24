import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../services/stock.service';
import { AvisosService } from '../../services/avisos.service';
import { Categoria, Presentacion, Variedad } from '../../models';

// "hereda" = usa lo de la categoría (porEncargue null en la base).
type ModoVenta = 'hereda' | 'stock' | 'encargue';

interface BorradorCategoria { nombre: string; porEncargue: boolean; nota: string }
interface BorradorPresentacion { nombre: string; unidades: number; precio: number | null }
interface BorradorVariedad {
  nombre: string;
  categoriaId: number;
  modo: ModoVenta;
  visible: boolean;
  precios: Record<number, number | null>; // presentacionId → precio propio (null = el de la categoría)
}

// Configuración: una tarjeta por categoría con sus presentaciones y variedades.
// Cada fila se edita sobre un "borrador" (una copia): lo que se tipea no toca la lista
// real hasta apretar Guardar, y si la API devuelve error la lista sigue como estaba.
@Component({
  selector: 'app-configuracion',
  imports: [FormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.scss',
})
export class Configuracion {
  private stock = inject(StockService);
  private avisos = inject(AvisosService);

  protected categorias = this.stock.categorias;
  protected grupos = this.stock.porCategoria;

  private bCat: Record<number, BorradorCategoria> = {};
  private bPres: Record<number, BorradorPresentacion> = {};
  private bVar: Record<number, BorradorVariedad> = {};
  // Filas de "agregar" de cada categoría.
  private nPres: Record<number, BorradorPresentacion> = {};
  private nVar: Record<number, { nombre: string; stock: number }> = {};

  protected nuevaCategoria = this.categoriaVacia();

  // ---- Borradores: ??= crea la copia la primera vez y después devuelve la misma ----

  borradorCat(c: Categoria) {
    return (this.bCat[c.id] ??= { nombre: c.nombre, porEncargue: c.porEncargue, nota: c.nota ?? '' });
  }

  borradorPres(p: Presentacion) {
    return (this.bPres[p.id] ??= { nombre: p.nombre, unidades: p.unidades, precio: p.precio });
  }

  borradorVar(v: Variedad) {
    return (this.bVar[v.id] ??= {
      nombre: v.nombre,
      categoriaId: v.categoriaId,
      modo: v.porEncargue === null ? 'hereda' : v.porEncargue ? 'encargue' : 'stock',
      visible: v.visible,
      precios: Object.fromEntries(v.precios.map((p) => [p.presentacionId, p.precio])),
    });
  }

  nuevaPres(categoriaId: number) {
    return (this.nPres[categoriaId] ??= { nombre: '', unidades: 1, precio: null });
  }

  nuevaVar(categoriaId: number) {
    return (this.nVar[categoriaId] ??= { nombre: '', stock: 0 });
  }

  // ---- Categorías ----

  guardarCategoria(c: Categoria) {
    const b = this.borradorCat(c);
    this.stock.editarCategoria(c.id, { nombre: b.nombre, porEncargue: b.porEncargue, nota: b.nota || null })
      .subscribe(this.alTerminar(`Categoría "${b.nombre}" guardada.`, () => delete this.bCat[c.id]));
  }

  eliminarCategoria(c: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    this.stock.eliminarCategoria(c.id).subscribe(this.alTerminar('Categoría eliminada.'));
  }

  // Una categoría sin presentaciones no se puede vender: se crea con la primera.
  crearCategoria() {
    const n = this.nuevaCategoria;
    this.stock.crearCategoria({ nombre: n.nombre, porEncargue: n.porEncargue, nota: n.nota || null })
      .subscribe({
        next: (c) => {
          this.stock
            .crearPresentacion({ categoriaId: c.id, nombre: n.presentacion, unidades: n.unidades, orden: 0 })
            .subscribe(this.alTerminar(`Categoría "${c.nombre}" creada.`, () => (this.nuevaCategoria = this.categoriaVacia())));
        },
        error: (err) => this.avisos.error(err),
      });
  }

  // ---- Presentaciones ----

  guardarPresentacion(p: Presentacion) {
    this.stock.editarPresentacion(p.id, this.borradorPres(p))
      .subscribe(this.alTerminar(`Presentación guardada.`, () => delete this.bPres[p.id]));
  }

  eliminarPresentacion(p: Presentacion) {
    if (!confirm(`¿Eliminar la presentación "${p.nombre}"?`)) return;
    this.stock.eliminarPresentacion(p.id).subscribe(this.alTerminar('Presentación eliminada.'));
  }

  crearPresentacion(c: Categoria) {
    const n = this.nuevaPres(c.id);
    this.stock.crearPresentacion({ ...n, categoriaId: c.id, orden: c.presentaciones.length })
      .subscribe(this.alTerminar(`Presentación "${n.nombre}" agregada.`, () => delete this.nPres[c.id]));
  }

  // ---- Variedades ----

  guardarVariedad(v: Variedad) {
    const b = this.borradorVar(v);
    const cambiaCategoria = b.categoriaId !== v.categoriaId;
    this.stock
      .editarVariedad(v.id, {
        nombre: b.nombre,
        categoriaId: b.categoriaId,
        porEncargue: b.modo === 'hereda' ? null : b.modo === 'encargue',
        visible: b.visible,
        // Si se muda de categoría, sus precios propios no aplican (el back los borra).
        // Si no, mando uno por presentación: vacío = null = usar el de la categoría.
        ...(cambiaCategoria
          ? {}
          : {
              precios: this.stock.presentacionesDe(v.categoriaId).map((p) => ({
                presentacionId: p.id,
                precio: b.precios[p.id] ?? null,
              })),
            }),
      } as Partial<Variedad>)
      .subscribe(this.alTerminar(`"${b.nombre}" guardada.`, () => delete this.bVar[v.id]));
  }

  // Si ya tiene ventas o encargues la API responde 409 con el consejo de ocultarla.
  eliminarVariedad(v: Variedad) {
    if (!confirm(`¿Eliminar "${v.nombre}"?`)) return;
    this.stock.eliminarVariedad(v.id).subscribe(this.alTerminar('Variedad eliminada.'));
  }

  crearVariedad(c: Categoria) {
    const n = this.nuevaVar(c.id);
    this.stock.crearVariedad({ nombre: n.nombre, categoriaId: c.id, stock: n.stock || 0 })
      .subscribe(this.alTerminar(`"${n.nombre}" agregada.`, () => delete this.nVar[c.id]));
  }

  // Lo mismo para todos los guardados: aviso de éxito + limpiar borrador, o aviso de error.
  private alTerminar(mensaje: string, limpiar?: () => void) {
    return {
      next: () => {
        limpiar?.();
        this.avisos.exito(mensaje);
      },
      error: (err: unknown) => this.avisos.error(err),
    };
  }

  private categoriaVacia() {
    return { nombre: '', porEncargue: false, nota: '', presentacion: 'unidad', unidades: 1 };
  }
}
