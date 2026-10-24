import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogoService, CategoriaCatalogo } from '../../services/catalogo.service';
import { mensajeDeError } from '../../services/avisos.service';

// Aclaraciones fijas por categoría, como en las placas de Instagram.
// Si algún día se quieren editar desde el panel, conviene pasarlas a un campo de Categoria.
const NOTAS: Record<string, string> = {
  soja: 'Todas contienen queso',
};

// Catálogo público: tarjetas por variedad, agrupadas por categoría. Sin cantidades.
@Component({
  selector: 'app-catalogo',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss',
})
export class Catalogo implements OnInit {
  private catalogoService = inject(CatalogoService);

  protected categorias = signal<CategoriaCatalogo[]>([]);
  protected cargando = signal(true);
  protected error = signal<string | null>(null);

  protected contacto = {
    telefono: '2494603441',
    instagram: 'hermanasemprendedoras',
    direccion: 'Pinto 1128',
    horarios: ['Lunes a viernes 9:30 a 13:30 y 17:30 a 20:30', 'Sábados 10:00 a 13:00'],
  };

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.catalogoService.obtener().subscribe({
      next: (c) => {
        this.categorias.set(c);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      },
    });
  }

  nota(c: CategoriaCatalogo): string | null {
    if (c.porEncargue) return 'Elaboramos por encargue';
    return NOTAS[c.nombre.toLowerCase()] ?? null;
  }
}
