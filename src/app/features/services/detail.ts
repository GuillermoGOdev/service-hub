import { Component, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin, switchMap } from 'rxjs';
import {
  CatalogApi,
  MessagesApi,
  Auth,
  Ui,
  Api,
  Service,
  Profile,
  Review,
  Category,
  Metrics,
  errorMessage,
} from '../../core/api';
import { Avatar, Dialog, Feedback, Icon, PrecioSolesPipe, LimaDatePipe } from '../../shared/ui';
import { ServiceCard } from '../../shared/service-card';
@Component({
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    Avatar,
    Dialog,
    Feedback,
    Icon,
    PrecioSolesPipe,
    LimaDatePipe,
    ServiceCard,
  ],
  template: ` <main class="page-width content-page">
    <sh-feedback [message]="error()" />
    @if (service(); as s) {
      <div class="detail-top">
        <nav class="breadcrumbs" aria-label="Ubicación">
          <a routerLink="/">Inicio</a><span>/</span
          ><a routerLink="/servicios" [queryParams]="{ category: s.categoryId }">{{
            category()?.name
          }}</a
          ><span>/</span><span>{{ typeName() }}</span>
        </nav>
        <div class="d-flex gap-3 align-items-center">
          <button class="text-button" (click)="ui.saved(s)">
            <sh-icon name="akar-icons_heart" /> {{ metrics()[s.id]?.savedCount || 0 }}</button
          ><button class="text-button" (click)="share()">Compartir</button>
        </div>
      </div>
      @if (from) {
        <a [routerLink]="[]" class="text-button small" (click)="back($event)"
          >← Volver a resultados</a
        >
      }
      @if (s.status !== 'published') {
        <div class="alert alert-warning">
          Este servicio está {{ s.status === 'paused' ? 'pausado' : 'en borrador' }}. No admite
          nuevas contrataciones.
        </div>
      }
      <div class="service-detail-grid">
        <article class="service-detail-main">
          <h1>{{ s.title }}</h1>
          <a class="provider-link detail-provider" [routerLink]="['/profesionales', s.providerId]"
            ><sh-avatar [name]="profile()?.name || ''" [fileId]="profile()?.avatarId" /><span
              ><strong>{{ profile()?.name }}</strong
              ><span class="muted"
                >{{ metrics()[s.id]?.level || 'Nuevo' }} ·
                @if (metrics()[s.id]?.reviewCount) {
                  {{ metrics()[s.id].rating.toFixed(1) }} ({{ metrics()[s.id].reviewCount }}
                  reseñas)
                } @else {
                  Sin reseñas
                }
              </span></span
            ></a
          >
          <div class="gallery" [style.background]="category()?.light">
            <img
              [src]="images()[imageIndex()]"
              [alt]="s.title"
              [class.illustrated]="!s.imageIds.length"
            />
            @if (images().length > 1) {
              <button
                class="gallery-prev icon-button"
                aria-label="Imagen anterior"
                (click)="imageIndex.set((imageIndex() + images().length - 1) % images().length)"
              >
                ←</button
              ><button
                class="gallery-next icon-button"
                aria-label="Imagen siguiente"
                (click)="imageIndex.set((imageIndex() + 1) % images().length)"
              >
                →
              </button>
            }
          </div>
          @if (images().length > 1) {
            <div class="thumbnails">
              @for (img of images(); track img; let i = $index) {
                <button
                  [class.selected]="i === imageIndex()"
                  (click)="imageIndex.set(i)"
                  [attr.aria-label]="'Ver imagen ' + (i + 1)"
                >
                  <img [src]="img" alt="" />
                </button>
              }
            </div>
          }
          @if (reviews()[0]; as review) {
            <div class="featured-review">
              <div class="section-heading">
                <strong>La experiencia de otros clientes</strong><a href="#reviews">Ver reseñas</a>
              </div>
              <p>“{{ review.comment }}”</p>
              <span class="muted">{{ review.authorName }} · {{ review.rating }} / 5</span>
            </div>
          }
          <section class="detail-section">
            <h2>Acerca de este servicio</h2>
            <p class="preserve-lines">{{ s.description }}</p>
            <div class="chips">
              <span class="badge-soft">{{
                s.modality === 'digital' ? 'Servicio digital' : 'Servicio presencial'
              }}</span>
              @if (s.region) {
                <span>{{ s.region }} · {{ s.zones }}</span>
              }
            </div>
          </section>
          <section class="detail-section">
            <h2>Conoce a {{ profile()?.name }}</h2>
            <div class="provider-link">
              <sh-avatar
                class="large"
                [name]="profile()?.name || ''"
                [fileId]="profile()?.avatarId"
              />
              <div>
                <a [routerLink]="['/profesionales', s.providerId]"
                  ><h3>{{ profile()?.name }}</h3></a
                >
                <p>{{ profile()?.headline }}</p>
              </div>
            </div>
            <p class="mt-4">{{ profile()?.about }}</p>
            <dl class="profile-facts">
              <div>
                <dt>Ubicación</dt>
                <dd>{{ profile()?.region }}</dd>
              </div>
              <div>
                <dt>Respuesta promedio</dt>
                <dd>{{ responseTime() }}</dd>
              </div>
              <div>
                <dt>Idiomas</dt>
                <dd>
                  @for (l of profile()?.languages; track l.name) {
                    <span>{{ l.name }} ({{ l.level }}) </span>
                  }
                </dd>
              </div>
            </dl>
            <button
              class="btn btn-outline-primary"
              (click)="contact()"
              [disabled]="s.providerId === auth.user()?.id"
            >
              Contactar
            </button>
          </section>
          <section class="detail-section">
            <h2>Preguntas frecuentes</h2>
            @for (f of s.faq; track f.question) {
              <details>
                <summary>{{ f.question }}</summary>
                <p>{{ f.answer }}</p>
              </details>
            }
          </section>
          <section class="detail-section" id="reviews">
            <div class="section-heading">
              <h2>Reseñas ({{ reviews().length }})</h2>
              <label class="small"
                >Orden<select class="form-select" [(ngModel)]="reviewSort">
                  <option value="recent">Más recientes</option>
                  <option value="best">Mejor valoradas</option>
                  <option value="worst">Menor valoración</option>
                </select></label
              >
            </div>
            <div class="rating-summary">
              @for (star of [5, 4, 3, 2, 1]; track star) {
                <div>
                  <span>{{ star }} estrellas</span
                  ><progress [value]="ratingCount(star)" [max]="reviews().length || 1"></progress
                  ><span>{{ ratingCount(star) }}</span>
                </div>
              }
            </div>
            @for (r of sortedReviews().slice(0, reviewLimit()); track r.id) {
              <article class="review">
                <div class="provider-link">
                  <sh-avatar [name]="r.authorName" />
                  <div>
                    <strong>{{ r.authorName }}</strong
                    ><small>{{ r.createdAt | limaDate }}</small>
                  </div>
                </div>
                <p class="mt-3">
                  <strong>{{ r.rating }} / 5</strong>
                  @if (r.cancelled) {
                    <span class="badge-soft">Pedido cancelado</span>
                  }
                </p>
                <p>{{ r.comment }}</p>
                @if (r.response) {
                  <blockquote>
                    <strong>Respuesta del profesional</strong>
                    <p>{{ r.response }}</p>
                  </blockquote>
                }
                @if (auth.user()?.id === s.providerId) {
                  <form class="d-flex gap-2" (ngSubmit)="respond(r.id)">
                    <input
                      class="form-control"
                      [name]="r.id"
                      [(ngModel)]="responses[r.id]"
                      placeholder="Escribe tu respuesta"
                      aria-label="Respuesta del profesional"
                    /><button class="btn btn-outline-primary">Responder</button>
                  </form>
                }
              </article>
            } @empty {
              <p class="muted">Este servicio aún no tiene reseñas.</p>
            }
            @if (reviewLimit() < reviews().length) {
              <button class="btn btn-outline-primary" (click)="reviewLimit.set(reviewLimit() + 5)">
                Ver más reseñas
              </button>
            }
          </section>
          <div class="chips">
            @for (tag of s.tags; track tag) {
              <a class="chip" routerLink="/servicios" [queryParams]="{ tag }">{{ tag }}</a>
            }
          </div>
        </article>
        <aside class="package-column">
          <div class="package-sticky">
            <div class="package-card">
              <div class="package-tabs" role="tablist" aria-label="Paquetes">
                @for (p of s.packages; track p.id; let i = $index) {
                  <button
                    role="tab"
                    [attr.aria-selected]="packageIndex() === i"
                    [class.selected]="packageIndex() === i"
                    (click)="packageIndex.set(i)"
                  >
                    {{ p.name }}
                  </button>
                }
              </div>
              <div class="package-body">
                <div class="section-heading">
                  <h3>{{ selectedPackage().name }}</h3>
                  <strong class="package-price">{{
                    selectedPackage().priceCents | precioSoles
                  }}</strong>
                </div>
                <p>{{ selectedPackage().scope }}</p>
                <p class="muted">
                  {{ selectedPackage().days }} días · por {{ selectedPackage().unit }}
                  @if (s.modality === 'digital') {
                    · {{ selectedPackage().revisions }} revisión(es)
                  }
                </p>
                <ul class="feature-list">
                  @for (f of selectedPackage().features; track f) {
                    <li><span aria-hidden="true">✓</span>{{ f }}</li>
                  }
                </ul>
                <button
                  class="btn btn-primary w-100"
                  (click)="book()"
                  [disabled]="s.status !== 'published' || s.providerId === auth.user()?.id"
                >
                  {{
                    selectedPackage().bookingMode === 'direct' ? 'Continuar' : 'Solicitar servicio'
                  }}
                </button>
              </div>
            </div>
            <button
              class="btn btn-outline-primary w-100 mt-3"
              (click)="contact()"
              [disabled]="s.providerId === auth.user()?.id"
            >
              Contactar al profesional
            </button>
          </div>
        </aside>
      </div>
      <section class="recommendations">
        <h2>Más de {{ profile()?.name }}</h2>
        <div class="service-grid">
          @for (item of more(); track item.id) {
            <sh-service-card
              [service]="item"
              [profile]="profile()"
              [metrics]="metrics()[item.id]"
            />
          }
        </div>
      </section>
      <section class="recommendations">
        <h2>Servicios relacionados</h2>
        <div class="service-grid">
          @for (item of related(); track item.id) {
            <sh-service-card
              [service]="item"
              [profile]="profiles().find(byId(item.providerId))"
              [metrics]="metrics()[item.id]"
            />
          }
        </div>
      </section>
      @if (drawer()) {
        <sh-dialog title="Configura tu servicio" [drawer]="true" (closed)="drawer.set(false)"
          ><h3>{{ s.title }}</h3>
          <p>
            {{ selectedPackage().name }} · {{ selectedPackage().priceCents | precioSoles }} /
            {{ selectedPackage().unit }}
          </p>
          <label class="w-100"
            >Cantidad de {{ selectedPackage().unit === 'hora' ? 'horas' : 'unidades'
            }}<input class="form-control" type="number" min="1" max="100" [(ngModel)]="quantity"
          /></label>
          @if (s.extras.length) {
            <h3 class="mt-4">Añade lo que necesitas</h3>
            @for (e of s.extras; track e.id) {
              <label class="extra-choice"
                ><input
                  class="form-check-input"
                  type="checkbox"
                  [checked]="extraIds.includes(e.id)"
                  (change)="toggleExtra(e.id)"
                /><span
                  >{{ e.name }}<small>+ {{ e.days }} día(s)</small></span
                ><strong>{{ e.priceCents | precioSoles }}</strong></label
              >
            }
          }
          <div class="total-row">
            <span>Total</span><strong>{{ total() | precioSoles }}</strong>
          </div>
          <button
            class="btn btn-primary w-100"
            [disabled]="quantity < 1 || quantity > 100 || quantity % 1 !== 0"
            (click)="checkout()"
          >
            Continuar al resumen
          </button></sh-dialog
        >
      }
      @if (requestOpen()) {
        <sh-dialog title="Cuéntale qué necesitas" (closed)="requestOpen.set(false)"
          ><p>{{ s.title }} · {{ selectedPackage().name }}</p>
          <form [formGroup]="requestForm" (ngSubmit)="sendRequest()">
            <label class="w-100"
              >Tu solicitud<textarea
                class="form-control"
                rows="5"
                formControlName="text"
              ></textarea></label
            ><label class="mt-3"
              >Adjuntar imagen<input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="form-control"
                (change)="upload($event)"
            /></label>
            @if (requestFile()) {
              <p class="small mt-2">Imagen adjunta</p>
            }
            <sh-feedback [message]="requestError()" /><button
              class="btn btn-primary mt-4"
              [disabled]="requestForm.invalid || sending()"
            >
              {{ sending() ? 'Enviando…' : 'Enviar solicitud' }}
            </button>
          </form></sh-dialog
        >
      }
    } @else if (!error()) {
      <div class="loading" role="status">Cargando servicio…</div>
    }
  </main>`,
})
export class ServiceDetail {
  api = inject(CatalogApi);
  files = inject(Api);
  messages = inject(MessagesApi);
  auth = inject(Auth);
  ui = inject(Ui);
  router = inject(Router);
  route = inject(ActivatedRoute);
  service = signal<Service | null>(null);
  profiles = signal<Profile[]>([]);
  categories = signal<Category[]>([]);
  typeName = signal('');
  all = signal<Service[]>([]);
  metrics = signal<Record<string, Metrics>>({});
  reviews = signal<Review[]>([]);
  error = signal('');
  imageIndex = signal(0);
  packageIndex = signal(0);
  drawer = signal(false);
  requestOpen = signal(false);
  requestError = signal('');
  requestFile = signal('');
  requestConversation = '';
  sending = signal(false);
  quantity = 1;
  extraIds: string[] = [];
  from = this.route.snapshot.queryParamMap.get('from');
  reviewSort = 'recent';
  reviewLimit = signal(5);
  responses: Record<string, string> = {};
  requestForm = inject(FormBuilder).nonNullable.group({
    text: ['', [Validators.required, Validators.minLength(10)]],
  });
  profile = computed(() => this.profiles().find((p) => p.userId === this.service()?.providerId));
  category = computed(() => this.categories().find((c) => c.id === this.service()?.categoryId));
  images = computed(() =>
    this.service()?.imageIds.length
      ? this.service()!.imageIds.map((id) => '/api/files/' + id + '/content')
      : [this.service()?.cover || ''],
  );
  selectedPackage = computed(() => this.service()!.packages[this.packageIndex()]);
  more = computed(() =>
    this.all()
      .filter((s) => s.id !== this.service()?.id && s.providerId === this.service()?.providerId)
      .slice(0, 4),
  );
  related = computed(() =>
    this.all()
      .filter((s) => s.id !== this.service()?.id && s.providerId !== this.service()?.providerId)
      .sort((a, b) => this.similarity(b) - this.similarity(a))
      .slice(0, 4),
  );
  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        switchMap(([p]) =>
          forkJoin({
            service: this.api.service(p.get('id')!),
            profiles: this.api.profiles(),
            categories: this.api.categories(),
            types: this.api.types(),
            all: this.api.services({ status: 'published' }),
            metrics: this.api.metrics(),
            reviews: this.api.reviews(p.get('id')!),
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (d) => {
          this.service.set(d.service);
          this.profiles.set(d.profiles);
          this.categories.set(d.categories);
          this.typeName.set(d.types.find((t) => t.id === d.service.typeId)?.name || '');
          this.all.set(d.all);
          this.metrics.set(d.metrics);
          this.reviews.set(d.reviews);
          this.imageIndex.set(0);
          const qp = this.route.snapshot.queryParamMap;
          const selected = d.service.packages.findIndex((p) => p.id === qp.get('package'));
          this.packageIndex.set(selected < 0 ? 0 : selected);
          if (qp.get('configure') === '1' && this.auth.user()) {
            this.quantity = Math.max(1, Math.min(100, Number(qp.get('quantity')) || 1));
            this.extraIds = (qp.get('extras') || '')
              .split(',')
              .filter((id) => d.service.extras.some((e) => e.id === id));
            if (this.selectedPackage().bookingMode === 'direct') this.drawer.set(true);
            else this.requestOpen.set(true);
          }
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  byId(id: string) {
    return (p: Profile) => p.userId === id;
  }
  similarity(s: Service) {
    const c = this.service();
    return (
      (s.categoryId === c?.categoryId ? 5 : 0) +
      (s.typeId === c?.typeId ? 3 : 0) +
      s.tags.filter((t) => c?.tags.includes(t)).length
    );
  }
  back(e: Event) {
    e.preventDefault();
    this.router.navigateByUrl(this.from?.startsWith('/servicios?') ? this.from : '/servicios');
  }
  share() {
    navigator.clipboard
      .writeText(location.origin + '/servicios/' + this.service()!.id)
      .then(() => this.ui.announce('Enlace copiado'))
      .catch(() => this.ui.announce('Copia la dirección desde tu navegador.'));
  }
  contact() {
    this.ui.access(() =>
      this.messages.open(this.service()!.providerId).subscribe({
        next: (c) => this.router.navigate(['/mensajes', c.id]),
        error: (e) => this.error.set(errorMessage(e)),
      }),
    );
  }
  book() {
    const serviceId = this.service()!.id;
    const packageId = this.selectedPackage().id;
    const quantity = this.quantity;
    const extras = this.extraIds.join(',');
    if (this.auth.user()) {
      if (this.selectedPackage().bookingMode === 'direct') this.drawer.set(true);
      else this.requestOpen.set(true);
      return;
    }
    this.ui.access(() =>
      this.router.navigate(['/servicios', serviceId], {
        queryParams: { package: packageId, quantity, extras, configure: 1 },
      }),
    );
  }
  toggleExtra(id: string) {
    this.extraIds = this.extraIds.includes(id)
      ? this.extraIds.filter((x) => x !== id)
      : [...this.extraIds, id];
  }
  total() {
    return (
      this.selectedPackage().priceCents * this.quantity +
      this.service()!
        .extras.filter((e) => this.extraIds.includes(e.id))
        .reduce((a, e) => a + e.priceCents, 0)
    );
  }
  checkout() {
    this.drawer.set(false);
    this.router.navigate(['/checkout'], {
      queryParams: {
        serviceId: this.service()!.id,
        packageId: this.selectedPackage().id,
        quantity: this.quantity,
        extras: this.extraIds.join(','),
      },
    });
  }
  upload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.sending.set(true);
    this.messages
      .open(this.service()!.providerId)
      .pipe(
        switchMap((c) => {
          this.requestConversation = c.id;
          return this.files.upload(file, c.id);
        }),
      )
      .subscribe({
        next: (f) => {
          this.requestFile.set(f.id);
          this.sending.set(false);
        },
        error: (e) => {
          this.requestError.set(errorMessage(e));
          this.sending.set(false);
        },
      });
  }
  sendRequest() {
    if (this.requestForm.invalid) return;
    this.sending.set(true);
    this.messages
      .request({
        serviceId: this.service()!.id,
        packageId: this.selectedPackage().id,
        text: this.requestForm.getRawValue().text,
        fileIds: this.requestFile() ? [this.requestFile()] : [],
      })
      .subscribe({
        next: (r) => {
          this.ui.announce('Solicitud enviada');
          this.router.navigate(['/mensajes', r.conversationId]);
        },
        error: (e) => {
          this.requestError.set(errorMessage(e));
          this.sending.set(false);
        },
      });
  }
  sortedReviews() {
    return [...this.reviews()].sort((a, b) =>
      this.reviewSort === 'best'
        ? b.rating - a.rating
        : this.reviewSort === 'worst'
          ? a.rating - b.rating
          : b.createdAt.localeCompare(a.createdAt),
    );
  }
  ratingCount(n: number) {
    return this.reviews().filter((r) => r.rating === n).length;
  }
  respond(id: string) {
    this.api.respond(id, this.responses[id] || '').subscribe({
      next: (r) => this.reviews.update((rs) => rs.map((x) => (x.id === r.id ? r : x))),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  responseTime() {
    const m = this.metrics()[this.service()?.id || '']?.responseMinutes;
    if (m == null) return 'Aún sin datos';
    return m < 10
      ? 'Menos de 10 minutos'
      : m < 30
        ? '10–30 minutos'
        : m < 60
          ? '30–60 minutos'
          : m < 90
            ? '1–1,5 horas'
            : m < 120
              ? '1,5–2 horas'
              : m < 240
                ? '2–4 horas'
                : m < 480
                  ? '4–8 horas'
                  : 'Más de 8 horas';
  }
}
