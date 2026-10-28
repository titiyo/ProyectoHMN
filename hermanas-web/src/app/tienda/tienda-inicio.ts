import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogoService } from '../services/catalogo.service';
import { ProductoCard } from './producto-card';
import { environment } from '../../environments/environment';

const ADELANTO = 5; // productos por categoría en la portada

// Portada: logo grande, cómo funciona, y una franja deslizable por categoría con "Ver más".
@Component({
  selector: 'app-tienda-inicio',
  imports: [RouterLink, ProductoCard],
  templateUrl: './tienda-inicio.html',
  styleUrl: './tienda-inicio.scss',
})
export class TiendaInicio {
  protected catalogo = inject(CatalogoService);
  protected consulta = `https://wa.me/${environment.whatsapp}?text=${encodeURIComponent('Hola! Quería hacer una consulta.')}`;

  protected secciones = computed(() =>
    this.catalogo.categorias().map((c) => ({
      categoria: c,
      adelanto: this.catalogo.ordenar(c.variedades).slice(0, ADELANTO),
      presentaciones: c.variedades[0]?.precios.map((p) => p.presentacion).join(', ') ?? '',
    })),
  );
}
