import { Routes } from '@angular/router';
import { Panel } from './panel/panel';

// El panel privado vive bajo /panel (en la Etapa 6 se protege con login).
// loadComponent = cada página se descarga recién cuando se entra a ella.
export const routes: Routes = [
  {
    path: 'panel',
    component: Panel,
    children: [
      { path: '', loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio), title: 'Inicio' },
      { path: 'stock', loadComponent: () => import('./pages/stock/stock').then((m) => m.StockPage), title: 'Stock' },
      { path: 'nueva-venta', loadComponent: () => import('./pages/nueva-venta/nueva-venta').then((m) => m.NuevaVenta), title: 'Nueva venta' },
      { path: 'ventas', loadComponent: () => import('./pages/ventas/ventas').then((m) => m.Ventas), title: 'Ventas' },
      { path: 'encargues', loadComponent: () => import('./pages/encargues/encargues').then((m) => m.Encargues), title: 'Encargues' },
      { path: 'por-hacer', loadComponent: () => import('./pages/por-hacer/por-hacer').then((m) => m.PorHacerPage), title: 'Por hacer' },
      { path: 'configuracion', loadComponent: () => import('./pages/configuracion/configuracion').then((m) => m.Configuracion), title: 'Configuración' },
    ],
  },
  // Catálogo público en la raíz.
  { path: '', loadComponent: () => import('./pages/catalogo/catalogo').then((m) => m.Catalogo), title: 'Hermanas Emprendedoras', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
];
