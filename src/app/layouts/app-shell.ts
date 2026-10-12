import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, timer, switchMap, of, catchError } from 'rxjs';
import {
  Auth,
  CatalogApi,
  Category,
  ListsApi,
  NotificationsApi,
  Notification,
  Ui,
  errorMessage,
} from '../core/api';
import { Avatar, Dialog, Icon, LimaDatePipe } from '../shared/ui';
import { AuthForm } from '../features/auth/auth';
import { SaveDialog } from '../shared/save-dialog';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    Avatar,
    Dialog,
    Icon,
    LimaDatePipe,
    AuthForm,
    SaveDialog,
  ],
  template: `
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    <header class="site-header page-width">
      <a routerLink="/" class="brand" aria-label="ServiceHub, inicio"
        ><img src="/assets/logo.svg" alt="ServiceHub" width="164" height="52"
      /></a>
      @if (!home()) {
        <form class="header-search search-box" (ngSubmit)="search()">
          <input
            name="search"
            [(ngModel)]="query"
            placeholder="Busca un servicio"
            aria-label="Buscar servicios"
          /><button class="icon-button" aria-label="Buscar">
            <sh-icon name="akar-icons_search" [size]="38" />
          </button>
        </form>
      }
      <nav class="main-nav" aria-label="Navegación principal">
        <a routerLink="/servicios" routerLinkActive="active">Explorar servicios</a>
        @if (!auth.user()?.providerEnabled) {
          <button class="text-button" (click)="offer()">Ofrecer servicios</button>
        }
      </nav>
      @if (auth.user(); as user) {
        <div class="account-nav">
          <button
            class="icon-button notification-button"
            aria-label="Notificaciones"
            (click)="notificationsOpen.set(true)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6" />
            </svg>
            @if (unread()) {
              <span class="notification-dot"></span>
            }</button
          ><a class="icon-button" routerLink="/mensajes" aria-label="Mensajes"
            ><sh-icon name="griddy-icons_email" /></a
          ><a class="icon-button" routerLink="/listas" aria-label="Mis listas"
            ><sh-icon name="akar-icons_heart" /></a
          ><a routerLink="/pedidos">Pedidos</a
          ><button
            class="avatar-button"
            (click)="menuOpen.set(true)"
            aria-label="Abrir menú de cuenta"
          >
            <sh-avatar [name]="user.name" />
          </button>
        </div>
      } @else {
        <div class="login-actions">
          <button class="text-button underlined" (click)="login(false)">Ingresar</button
          ><button class="btn btn-primary" (click)="login(true)">Registrarse</button>
        </div>
      }
    </header>
    @if (exploring()) {
      <nav class="category-nav" aria-label="Categorías">
        <div class="page-width">
          @for (c of categories(); track c.id) {
            <a routerLink="/servicios" [queryParams]="{ category: c.id }">{{ c.name }}</a>
          }
        </div>
      </nav>
    }
    <div id="main-content" tabindex="-1"><router-outlet /></div>
    @if (!chat()) {
      <footer class="site-footer page-width">
        <a routerLink="/" class="brand"
          ><img src="/assets/logo.svg" alt="ServiceHub" width="164" height="52" /></a
        ><span>Hecho para conectar talento en Perú.</span
        ><a routerLink="/servicios">Explorar servicios</a
        ><span class="muted small">Proyecto académico · PC2</span>
      </footer>
    }
    <div class="toast-region" aria-live="polite">
      @if (ui.toast()) {
        <div class="app-toast">{{ ui.toast() }}</div>
      }
    </div>
    @if (ui.authOpen()) {
      <sh-dialog
        [title]="ui.register() ? 'Crea tu cuenta' : 'Iniciar sesión'"
        (closed)="ui.cancelAuth()"
        ><sh-auth-form [register]="ui.register()" [intent]="ui.intent()" (done)="signed($event)"
      /></sh-dialog>
    }
    @if (ui.saveService(); as s) {
      <sh-save-dialog [service]="s" (closed)="ui.saveService.set(null)" />
    }
    @if (menuOpen()) {
      <sh-dialog [compact]="true" title="Tu cuenta" (closed)="menuOpen.set(false)"
        ><nav class="account-menu" (click)="menuOpen.set(false)">
          <a routerLink="/mi-perfil">Mi perfil</a>
          @if (auth.user()?.providerEnabled) {
            <a routerLink="/mis-servicios">Mis servicios</a
            ><a routerLink="/servicios/nuevo">Publicar un servicio</a>
          } @else {
            <a routerLink="/bienvenida" [queryParams]="{ intent: 'provider' }">Ofrecer servicios</a>
          }
          <a routerLink="/movimientos">Movimientos</a><a routerLink="/listas">Mis listas</a
          ><button class="btn btn-outline-danger" (click)="logout()">Cerrar sesión</button>
        </nav></sh-dialog
      >
    }
    @if (notificationsOpen()) {
      <sh-dialog [compact]="true" title="Notificaciones" (closed)="notificationsOpen.set(false)">
        @for (n of notifications(); track n.id) {
          <div class="notification-row" [class.unread]="!n.read">
            <a [routerLink]="n.url" (click)="read(n); notificationsOpen.set(false)"
              >{{ n.title }}<small>{{ n.createdAt | limaDate }}</small></a
            >
            @if (!n.read) {
              <button class="text-button small" (click)="read(n)">Marcar leído</button>
            }
          </div>
        } @empty {
          <div class="empty-state">
            Estás al día. Aquí verás las novedades de tus conversaciones y pedidos.
          </div>
        }
      </sh-dialog>
    }
  `,
})
export class App {
  auth = inject(Auth);
  ui = inject(Ui);
  router = inject(Router);
  catalog = inject(CatalogApi);
  lists = inject(ListsApi);
  notices = inject(NotificationsApi);
  destroy = inject(DestroyRef);
  url = signal(this.router.url);
  home = computed(() => this.url().split('?')[0] === '/');
  chat = computed(() => this.url().startsWith('/mensajes'));
  exploring = computed(
    () =>
      this.url().startsWith('/servicios') &&
      !this.url().includes('/editar') &&
      !this.url().includes('/nuevo'),
  );
  categories = signal<Category[]>([]);
  query = '';
  menuOpen = signal(false);
  notificationsOpen = signal(false);
  notifications = signal<Notification[]>([]);
  unread = computed(() => this.notifications().some((n) => !n.read));
  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.url.set(this.router.url);
        this.menuOpen.set(false);
        if (!this.chat()) window.scrollTo({ top: 0 });
      });
    this.auth.refresh().subscribe({
      next: (u) => {
        if (u) this.loadLists();
      },
      error: () => this.ui.announce('No se pudo conectar con la API. Ejecuta npm start.'),
    });
    this.catalog.categories().subscribe({ next: (c) => this.categories.set(c), error: () => {} });
    timer(0, 15000)
      .pipe(
        switchMap(() =>
          this.auth.user() ? this.notices.all().pipe(catchError(() => of([]))) : of([]),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((n) => this.notifications.set(n));
  }
  search() {
    this.router.navigate(['/servicios'], { queryParams: { q: this.query || null } });
  }
  login(register: boolean) {
    this.ui.access(() => this.loadLists(), register);
  }
  offer() {
    this.ui.access(
      () =>
        this.router.navigate(
          [this.auth.user()?.providerEnabled ? '/mis-servicios' : '/bienvenida'],
          { queryParams: { intent: 'provider' } },
        ),
      true,
      'provider',
    );
  }
  signed(registered: boolean) {
    this.ui.authenticated(registered);
    this.loadLists();
  }
  loadLists() {
    this.lists.load().subscribe({ error: () => {} });
  }
  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.lists.lists.set([]);
        this.router.navigate(['/']);
      },
      error: (e) => this.ui.announce(errorMessage(e)),
    });
  }
  read(n: Notification) {
    this.notices.read(n.id).subscribe({
      next: () =>
        this.notifications.update((ns) =>
          ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        ),
      error: (e) => this.ui.announce(errorMessage(e)),
    });
  }
}
