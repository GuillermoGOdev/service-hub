import { Routes } from '@angular/router';
import { signedIn, providerOnly } from './core/api';

export const routes: Routes = [
  {
    path: '',
    title: 'ServiceHub · Conectemos personas e ideas',
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Home),
  },
  {
    path: 'servicios',
    title: 'Explorar servicios · ServiceHub',
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'servicios/nuevo',
    title: 'Crear servicio · ServiceHub',
    canActivate: [providerOnly],
    loadComponent: () => import('./features/provider/provider').then((m) => m.ServiceEditor),
  },
  {
    path: 'servicios/:id/editar',
    title: 'Editar servicio · ServiceHub',
    canActivate: [providerOnly],
    loadComponent: () => import('./features/provider/provider').then((m) => m.ServiceEditor),
  },
  {
    path: 'servicios/:id',
    title: 'Detalle del servicio · ServiceHub',
    loadComponent: () => import('./features/services/detail').then((m) => m.ServiceDetail),
  },
  {
    path: 'profesionales/:id',
    title: 'Perfil profesional · ServiceHub',
    loadComponent: () => import('./features/profiles/profiles').then((m) => m.PublicProfile),
  },
  {
    path: 'acceso',
    title: 'Acceso · ServiceHub',
    loadComponent: () => import('./features/auth/auth').then((m) => m.AuthPage),
  },
  {
    path: 'bienvenida',
    title: 'Bienvenida · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/profiles/profiles').then((m) => m.Onboarding),
  },
  {
    path: 'mi-perfil',
    title: 'Mi perfil · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/profiles/profiles').then((m) => m.MyProfile),
  },
  {
    path: 'mis-servicios',
    title: 'Mis servicios · ServiceHub',
    canActivate: [providerOnly],
    loadComponent: () => import('./features/provider/provider').then((m) => m.MyServices),
  },
  {
    path: 'checkout',
    title: 'Confirmar contratación · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/orders/checkout').then((m) => m.Checkout),
  },
  {
    path: 'pedidos',
    title: 'Mis pedidos · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/orders/orders').then((m) => m.Orders),
  },
  {
    path: 'pedidos/:id',
    title: 'Pedido · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/orders/orders').then((m) => m.OrderDetail),
  },
  {
    path: 'movimientos',
    title: 'Movimientos · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/orders/orders').then((m) => m.Billing),
  },
  {
    path: 'mensajes',
    title: 'Mensajes · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/messages/messages').then((m) => m.Messages),
  },
  {
    path: 'mensajes/:id',
    title: 'Conversación · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/messages/messages').then((m) => m.Messages),
  },
  {
    path: 'listas/compartida/:token',
    title: 'Lista compartida · ServiceHub',
    loadComponent: () => import('./features/lists/lists').then((m) => m.SharedList),
  },
  {
    path: 'listas',
    title: 'Mis listas · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/lists/lists').then((m) => m.Lists),
  },
  {
    path: 'listas/:id',
    title: 'Lista · ServiceHub',
    canActivate: [signedIn],
    loadComponent: () => import('./features/lists/lists').then((m) => m.Lists),
  },
  {
    path: '**',
    title: 'Página no encontrada · ServiceHub',
    loadComponent: () => import('./shared/not-found').then((m) => m.NotFound),
  },
];
