import { Routes } from '@angular/router';
import { Panel } from './panel/panel';
import { panelGuard } from './auth/auth.guard';

// El panel privado vive bajo /panel y lo protege panelGuard (pide login).
// loadComponent = cada página se descarga recién cuando se entra a ella.
export const routes: Routes = [
  {
    path: 'panel',
    component: Panel,
    canActivate: [panelGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio), title: 'Inicio' },
      { path: 'stock', loadComponent: () => import('./pages/stock/stock').then((m) => m.StockPage), title: 'Stock' },
      { path: 'nueva-venta', loadComponent: () => import('./pages/nueva-venta/nueva-venta').then((m) => m.NuevaVenta), title: 'Nueva venta' },
      { path: 'ventas', loadComponent: () => import('./pages/ventas/ventas').then((m) => m.Ventas), title: 'Ventas' },
      { path: 'encargues', loadComponent: () => import('./pages/encargues/encargues').then((m) => m.Encargues), title: 'Encargues' },
      { path: 'pedidos-web', loadComponent: () => import('./pages/pedidos-web/pedidos-web').then((m) => m.PedidosWebPage), title: 'Pedidos web' },
      { path: 'por-hacer', loadComponent: () => import('./pages/por-hacer/por-hacer').then((m) => m.PorHacerPage), title: 'Por hacer' },
      { path: 'configuracion', loadComponent: () => import('./pages/configuracion/configuracion').then((m) => m.Configuracion), title: 'Configuración' },
    ],
  },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login), title: 'Ingresar' },
  // Tienda pública: portada en "/" y una página por categoría ("/tartas-integrales").
  // Va DESPUÉS de panel y login: Angular prueba las rutas en orden, y ":slug" agarraría
  // cualquier palabra (incluidas "panel" y "login") si estuviera antes.
  {
    path: '',
    loadComponent: () => import('./tienda/tienda-layout').then((m) => m.TiendaLayout),
    children: [
      { path: '', loadComponent: () => import('./tienda/tienda-inicio').then((m) => m.TiendaInicio), title: 'Hermanas Emprendedoras', pathMatch: 'full' },
      { path: ':slug', loadComponent: () => import('./tienda/tienda-categoria').then((m) => m.TiendaCategoria), title: 'Hermanas Emprendedoras' },
    ],
  },
  { path: '**', redirectTo: '' },
];
