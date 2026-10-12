import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import {
  CatalogApi,
  Service,
  Profile,
  Category,
  ServiceType,
  Metrics,
  errorMessage,
} from '../../core/api';
import { ServiceCard } from '../../shared/service-card';
import { Feedback, Icon } from '../../shared/ui';
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, ServiceCard, Icon, Feedback],
  template: ` <main class="page-width home-page">
    <section class="hero">
      <div class="hero-content">
        <h1>
          Conectemos personas<br class="desktop-break" />
          e ideas.
        </h1>
        <p>
          Encuentra a quien sabe hacerlo. Servicios digitales y cerca de ti, para dar vida a tu
          próximo proyecto.
        </p>
        <form class="hero-search search-box" (ngSubmit)="search()">
          <input
            name="q"
            [(ngModel)]="query"
            aria-label="¿Qué servicio estás buscando?"
            placeholder="¿Qué servicio estás buscando?"
          /><button class="btn btn-primary" aria-label="Buscar servicios">
            <sh-icon name="akar-icons_search" [size]="51" />
          </button>
        </form>
      </div>
    </section>
    <section class="category-grid" aria-label="Explorar por categoría">
      @for (c of categories(); track c.id) {
        <a
          class="category-card"
          routerLink="/servicios"
          [queryParams]="{ category: c.id }"
          [style.--category-color]="c.color"
          [style.--category-light]="c.light"
          ><div class="category-art"><img [src]="c.illustration" alt="" /></div>
          <h2>{{ c.name }}</h2>
          <span>{{ count(c.id) }} servicios</span></a
        >
      }
    </section>
    <section class="featured">
      <div class="section-heading">
        <h2>El talento que buscas,<br />a un paso de ti.</h2>
        <a routerLink="/servicios" class="text-link">Explorar todos los servicios <sh-icon /></a>
      </div>
      <nav class="chips" aria-label="Etiquetas destacadas">
        @for (
          tag of ['diseño', 'web', 'reparaciones', 'redacción', 'aprendizaje', 'laptops'];
          track tag
        ) {
          <a class="chip" routerLink="/servicios" [queryParams]="{ tag }">{{ tag }}</a>
        }
      </nav>
      <sh-feedback [message]="error()" />
      @if (loading()) {
        <div class="loading" role="status">Cargando servicios…</div>
      }
      <div class="service-grid">
        @for (s of services().slice(0, 8); track s.id) {
          <sh-service-card
            [service]="s"
            [profile]="profile(s.providerId)"
            [metrics]="metrics()[s.id]"
            [color]="color(s.categoryId)"
          />
        }
      </div>
    </section>
  </main>`,
})
export class Home {
  api = inject(CatalogApi);
  router = inject(Router);
  query = '';
  services = signal<Service[]>([]);
  categories = signal<Category[]>([]);
  profiles = signal<Profile[]>([]);
  metrics = signal<Record<string, Metrics>>({});
  error = signal('');
  loading = signal(true);
  constructor() {
    forkJoin({
      services: this.api.services({ status: 'published' }),
      categories: this.api.categories(),
      profiles: this.api.profiles(),
      metrics: this.api.metrics(),
    }).subscribe({
      next: (d) => {
        this.services.set(d.services);
        this.categories.set(d.categories);
        this.profiles.set(d.profiles);
        this.metrics.set(d.metrics);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  search() {
    this.router.navigate(['/servicios'], { queryParams: { q: this.query } });
  }
  profile(id: string) {
    return this.profiles().find((p) => p.userId === id);
  }
  color(id: string) {
    return this.categories().find((c) => c.id === id)?.light || '#f3f3f7';
  }
  count(id: string) {
    return this.services().filter((s) => s.categoryId === id).length;
  }
}
@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, ServiceCard, Feedback],
  template: ` <main class="page-width content-page">
    <nav class="breadcrumbs" aria-label="Ubicación">
      <a routerLink="/">Inicio</a><span>/</span><span>Servicios</span>
    </nav>
    <h1>{{ title() }}</h1>
    <form class="catalog-filters" (ngSubmit)="apply()">
      <label
        >Categoría<select
          class="form-select"
          name="category"
          [(ngModel)]="filters.category"
          (ngModelChange)="filters.type = ''; apply()"
        >
          <option value="">Todas las categorías</option>
          @for (c of categories(); track c.id) {
            <option [value]="c.id">{{ c.name }}</option>
          }
        </select></label
      >
      @if (filters.category) {
        <label
          >Tipo<select
            class="form-select"
            name="type"
            [(ngModel)]="filters.type"
            (ngModelChange)="apply()"
          >
            <option value="">Todos los tipos</option>
            @for (t of types(); track t.id) {
              @if (t.categoryId === filters.category) {
                <option [value]="t.id">{{ t.name }}</option>
              }
            }
          </select></label
        >
      }
      <label
        >Modalidad<select
          class="form-select"
          name="mode"
          [(ngModel)]="filters.mode"
          (ngModelChange)="apply()"
        >
          <option value="">Todas</option>
          <option value="digital">Digital</option>
          <option value="presencial">Presencial</option>
        </select></label
      >
      @if (filters.mode === 'presencial') {
        <label
          >Ubicación o zona<input
            class="form-control"
            name="region"
            [(ngModel)]="filters.region"
            (change)="apply()"
            placeholder="Lima, Surco…"
        /></label>
      }
      <label
        >Presupuesto máximo (S/)<input
          type="number"
          min="0"
          class="form-control"
          name="budget"
          [(ngModel)]="filters.budget"
          (change)="apply()"
          placeholder="Sin límite" /></label
      ><label
        >Plazo máximo<select
          class="form-select"
          name="days"
          [(ngModel)]="filters.days"
          (ngModelChange)="apply()"
        >
          <option value="">Cualquier plazo</option>
          <option value="3">Hasta 3 días</option>
          <option value="7">Hasta 7 días</option>
          <option value="14">Hasta 14 días</option>
        </select></label
      ><label
        >Valoración<select
          class="form-select"
          name="rating"
          [(ngModel)]="filters.rating"
          (ngModelChange)="apply()"
        >
          <option value="">Todas</option>
          <option value="4">4 o más</option>
          <option value="4.8">4,8 o más</option>
        </select></label
      >
    </form>
    <div class="results-bar">
      <span
        >{{ filtered().length }} resultados
        @if (filters.tag) {
          <button class="chip" (click)="filters.tag = ''; apply()">{{ filters.tag }} ×</button>
        }
        <button class="text-button muted" (click)="clear()">Limpiar filtros</button></span
      ><label
        >Ordenar por
        <select
          class="sort-select"
          name="sort"
          [(ngModel)]="filters.sort"
          (ngModelChange)="apply()"
        >
          <option value="relevance">Relevancia</option>
          <option value="rating">Mejor valorados</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="recent">Recientes</option>
        </select></label
      >
    </div>
    <sh-feedback [message]="error()" />
    @if (loading()) {
      <div class="loading" role="status">Buscando servicios…</div>
    } @else {
      <div class="service-grid">
        @for (s of pageItems(); track s.id) {
          <sh-service-card
            [service]="s"
            [profile]="profile(s.providerId)"
            [metrics]="metrics()[s.id]"
            [color]="color(s.categoryId)"
            [returnTo]="router.url"
          />
        } @empty {
          <div class="empty-state">
            <h2>No encontramos servicios con esos filtros.</h2>
            <button class="btn btn-outline-primary" (click)="clear()">
              Ver todos los servicios
            </button>
          </div>
        }
      </div>
    }
    @if (pageCount() > 1) {
      <nav class="pagination-bar" aria-label="Páginas de resultados">
        <button
          class="page-button"
          [disabled]="page() === 1"
          (click)="go(page() - 1)"
          aria-label="Página anterior"
        >
          ←
        </button>
        @for (n of pages(); track n) {
          <button
            class="page-button"
            [class.current]="page() === n"
            [attr.aria-current]="page() === n ? 'page' : null"
            (click)="go(n)"
          >
            {{ n }}
          </button>
        }
        <button
          class="page-button"
          [disabled]="page() === pageCount()"
          (click)="go(page() + 1)"
          aria-label="Página siguiente"
        >
          →
        </button>
      </nav>
    }
  </main>`,
})
export class Catalog {
  api = inject(CatalogApi);
  route = inject(ActivatedRoute);
  router = inject(Router);
  services = signal<Service[]>([]);
  categories = signal<Category[]>([]);
  types = signal<ServiceType[]>([]);
  profiles = signal<Profile[]>([]);
  metrics = signal<Record<string, Metrics>>({});
  error = signal('');
  loading = signal(true);
  params = signal<Record<string, string>>({});
  page = signal(1);
  filters: Record<string, string> = {};
  title = computed(() =>
    this.params()['q']
      ? `Resultados para “${this.params()['q']}”`
      : this.categories().find((c) => c.id === this.params()['category'])?.name ||
        'Encuentra tu próximo servicio',
  );
  filtered = computed(() => {
    const f = this.params(),
      m = this.metrics(),
      q = normalize(f['q'] || '');
    const text = (s: Service) => normalize([s.title, s.description, ...s.tags].join(' '));
    const score = (s: Service) =>
      (q && normalize(s.title).includes(q) ? 10 : 0) + (m[s.id]?.rating || 0);
    const result = this.services().filter(
      (s) =>
        (!q || text(s).includes(q)) &&
        (!f['category'] || s.categoryId === f['category']) &&
        (!f['type'] || s.typeId === f['type']) &&
        (!f['tag'] || s.tags.some((t) => normalize(t) === normalize(f['tag']))) &&
        (!f['mode'] || s.modality === f['mode']) &&
        (!(f['mode'] === 'presencial' && f['region']) ||
          normalize(s.region + ' ' + s.zones).includes(normalize(f['region']))) &&
        (!f['budget'] || s.packages[0].priceCents <= Number(f['budget']) * 100) &&
        (!f['days'] || s.packages[0].days <= Number(f['days'])) &&
        (!f['rating'] || (m[s.id]?.rating || 0) >= Number(f['rating'])),
    );
    return result.sort((a, b) => {
      switch (f['sort']) {
        case 'price-asc':
          return a.packages[0].priceCents - b.packages[0].priceCents;
        case 'price-desc':
          return b.packages[0].priceCents - a.packages[0].priceCents;
        case 'rating':
          return (m[b.id]?.rating || 0) - (m[a.id]?.rating || 0);
        case 'recent':
          return b.createdAt.localeCompare(a.createdAt);
        default:
          return score(b) - score(a) || a.id.localeCompare(b.id, undefined, { numeric: true });
      }
    });
  });
  pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / 8)));
  pages = computed(() => Array.from({ length: this.pageCount() }, (_, i) => i + 1));
  pageItems = computed(() =>
    this.filtered().slice(
      (Math.min(this.page(), this.pageCount()) - 1) * 8,
      Math.min(this.page(), this.pageCount()) * 8,
    ),
  );
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((p) => {
      const f: Record<string, string> = {};
      p.keys.forEach((k) => (f[k] = p.get(k) || ''));
      this.filters = {
        q: '',
        category: '',
        type: '',
        tag: '',
        mode: '',
        region: '',
        budget: '',
        days: '',
        rating: '',
        sort: 'relevance',
        ...f,
      };
      this.params.set({ ...this.filters });
      this.page.set(Math.max(1, Number(p.get('page')) || 1));
    });
    forkJoin({
      services: this.api.services({ status: 'published' }),
      categories: this.api.categories(),
      types: this.api.types(),
      profiles: this.api.profiles(),
      metrics: this.api.metrics(),
    }).subscribe({
      next: (d) => {
        this.services.set(d.services);
        this.categories.set(d.categories);
        this.types.set(d.types);
        this.profiles.set(d.profiles);
        this.metrics.set(d.metrics);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  apply() {
    this.router.navigate(['/servicios'], { queryParams: { ...this.filters, page: 1 } });
  }
  clear() {
    this.router.navigate(['/servicios']);
  }
  go(page: number) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }
  profile(id: string) {
    return this.profiles().find((p) => p.userId === id);
  }
  color(id: string) {
    return this.categories().find((c) => c.id === id)?.light || '#f3f3f7';
  }
}
