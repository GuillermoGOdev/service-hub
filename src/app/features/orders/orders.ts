import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  OrdersApi,
  Auth,
  Ui,
  Order,
  CatalogApi,
  Review,
  Payment,
  errorMessage,
} from '../../core/api';
import { Dialog, Feedback, PrecioSolesPipe, StatusLabelPipe, LimaDatePipe } from '../../shared/ui';
const statuses = ['agreed', 'in_progress', 'delivered', 'completed', 'cancelled'];
@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, Feedback, PrecioSolesPipe, StatusLabelPipe, LimaDatePipe],
  template: `<main class="page-width content-page">
    <nav class="breadcrumbs"><a routerLink="/">Inicio</a><span>/</span><span>Pedidos</span></nav>
    <h1>Mis pedidos</h1>
    <div class="view-tabs">
      <button [class.selected]="role === 'customer'" (click)="role = 'customer'">
        Mis contrataciones
      </button>
      @if (auth.user()?.providerEnabled) {
        <button [class.selected]="role === 'provider'" (click)="role = 'provider'">
          Trabajos recibidos
        </button>
      }
    </div>
    <div class="filter-row">
      <label
        >Estado<select class="form-select" [(ngModel)]="status">
          <option value="">Todos</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s | statusLabel }}</option>
          }
        </select></label
      ><label>Desde<input type="date" class="form-control" [(ngModel)]="from" /></label
      ><label>Hasta<input type="date" class="form-control" [(ngModel)]="to" /></label>
    </div>
    <sh-feedback [message]="error()" />
    <div class="table-responsive">
      <table class="table table-striped table-hover management-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Servicio / contraparte</th>
            <th>Estado</th>
            <th>Importe</th>
            <th>Plazo</th>
          </tr>
        </thead>
        <tbody>
          @for (o of filtered(); track o.id) {
            <tr>
              <td>
                <a [routerLink]="['/pedidos', o.id]">{{ o.id.slice(0, 12) }}</a>
              </td>
              <td>
                {{ o.snapshot.title
                }}<small>{{
                  role === 'customer'
                    ? o.snapshot.providerName
                    : o.snapshot.customerName || 'Cliente: ' + o.customerId
                }}</small>
              </td>
              <td>
                <span class="badge-soft">{{ o.status | statusLabel }}</span
                ><small>{{ o.paymentStatus | statusLabel }}</small>
              </td>
              <td>{{ o.totalCents | precioSoles }}</td>
              <td>{{ o.confirmedAt || o.dueAt | limaDate }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5"><div class="empty-state">No hay pedidos con estos filtros.</div></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </main>`,
})
export class Orders {
  api = inject(OrdersApi);
  auth = inject(Auth);
  items = signal<Order[]>([]);
  error = signal('');
  statuses = statuses;
  role = 'customer';
  status = '';
  from = '';
  to = '';
  constructor() {
    this.api
      .all()
      .subscribe({ next: (o) => this.items.set(o), error: (e) => this.error.set(errorMessage(e)) });
  }
  filtered() {
    return this.items().filter(
      (o) =>
        (this.role === 'customer' ? o.customerId : o.providerId) === this.auth.user()?.id &&
        (!this.status || o.status === this.status) &&
        (!this.from || o.createdAt.slice(0, 10) >= this.from) &&
        (!this.to || o.createdAt.slice(0, 10) <= this.to),
    );
  }
}
@Component({
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    Dialog,
    Feedback,
    PrecioSolesPipe,
    StatusLabelPipe,
    LimaDatePipe,
  ],
  template: `<main class="page-width content-page">
    <nav class="breadcrumbs">
      <a routerLink="/pedidos">Pedidos</a><span>/</span><span>Detalle</span>
    </nav>
    <sh-feedback [message]="error()" /><sh-feedback
      [message]="created ? 'Tu contratación está confirmada.' : ''"
      [success]="true"
    />
    @if (order(); as o) {
      <div class="section-heading">
        <div>
          <p class="eyebrow">PEDIDO {{ o.id.slice(0, 12) }}</p>
          <h1>{{ o.snapshot.title }}</h1>
        </div>
        <span class="badge-soft">{{ o.status | statusLabel }}</span>
      </div>
      <div class="checkout-grid">
        <article>
          <section class="summary-panel">
            <div class="section-heading">
              <h2>El acuerdo</h2>
              <a [routerLink]="['/mensajes', o.conversationId]">Ir a la conversación</a>
            </div>
            <p>{{ o.snapshot.packageName }} · {{ o.snapshot.providerName }}</p>
            <p>{{ o.snapshot.scope }}</p>
            <p class="preserve-lines"><strong>Requisitos:</strong> {{ o.requirements }}</p>
            <div class="summary-row">
              <span>{{ o.snapshot.quantity }} × {{ o.snapshot.unitPriceCents | precioSoles }}</span
              ><strong>{{ o.snapshot.quantity * o.snapshot.unitPriceCents | precioSoles }}</strong>
            </div>
            @for (e of o.snapshot.extras; track e.id) {
              <div class="summary-row">
                <span>{{ e.name }}</span
                ><span>{{ e.priceCents | precioSoles }}</span>
              </div>
            }
            <div class="total-row">
              <strong>Total</strong><strong>{{ o.totalCents | precioSoles }}</strong>
            </div>
          </section>
          @if (o.snapshot.modality === 'presencial') {
            <section class="detail-section">
              <h2>Atención presencial</h2>
              <p><strong>Dirección:</strong> {{ o.address }}</p>
              <p>Solicitada: {{ o.requestedAt | limaDate }}</p>
              <p>Confirmada: {{ o.confirmedAt | limaDate }}</p>
              @if (provider() && ['agreed', 'in_progress'].includes(o.status)) {
                <label
                  >Confirmar fecha (Lima)<input
                    type="datetime-local"
                    class="form-control"
                    [(ngModel)]="schedule" /></label
                ><button
                  class="btn btn-outline-primary mt-3"
                  [disabled]="!schedule || busy()"
                  (click)="action('schedule')"
                >
                  Confirmar fecha
                </button>
              }
            </section>
          }
          <section class="detail-section">
            <h2>Historial del pedido</h2>
            <ol class="timeline">
              @for (e of o.events; track $index) {
                <li>
                  <strong>{{ eventName(e.action) }}</strong
                  ><small>{{ e.at | limaDate }}</small>
                  @if (e.note) {
                    <p>{{ e.note }}</p>
                  }
                </li>
              }
            </ol>
          </section>
          @if (canReview() && !review()) {
            <section class="detail-section">
              <h2>Comparte tu experiencia</h2>
              <form [formGroup]="reviewForm" (ngSubmit)="sendReview()" class="form-stack">
                <label
                  >Calificación<select class="form-select" formControlName="rating">
                    @for (r of [5, 4, 3, 2, 1]; track r) {
                      <option [ngValue]="r">{{ r }} de 5</option>
                    }
                  </select></label
                ><label
                  >Tu reseña<textarea
                    class="form-control"
                    formControlName="comment"
                    rows="4"
                  ></textarea></label
                ><button class="btn btn-primary" [disabled]="reviewForm.invalid || busy()">
                  Publicar reseña
                </button>
              </form>
            </section>
          }
          @if (review(); as r) {
            <section class="detail-section">
              <h2>Reseña del pedido</h2>
              <strong>{{ r.rating }} / 5</strong>
              <p>{{ r.comment }}</p>
              @if (r.cancelled) {
                <span class="badge-soft">Pedido cancelado</span>
              }
            </section>
          }
        </article>
        <aside class="summary-panel order-actions">
          <h2>Seguimiento</h2>
          <p>{{ o.status | statusLabel }}</p>
          <p>Fecha límite: {{ o.dueAt | limaDate }}</p>
          @if (late()) {
            <div class="alert alert-warning">El plazo acordado ha vencido.</div>
          }
          <h3>Pago</h3>
          <p>{{ o.paymentStatus | statusLabel }} · {{ o.paymentMode | statusLabel }}</p>
          <div class="form-stack">
            @if (provider() && o.status === 'agreed') {
              <button class="btn btn-primary" [disabled]="busy()" (click)="action('start')">
                Iniciar trabajo
              </button>
            }
            @if (provider() && o.status === 'in_progress') {
              <button class="btn btn-primary" [disabled]="busy()" (click)="action('deliver')">
                Marcar entrega realizada
              </button>
            }
            @if (!provider() && o.status === 'delivered') {
              <button class="btn btn-primary" [disabled]="busy()" (click)="action('complete')">
                Confirmar entrega</button
              ><button class="btn btn-outline-primary" (click)="pendingAction.set('adjust')">
                Solicitar ajuste
              </button>
            }
            @if (
              !provider() &&
              o.paymentMode === 'onsite' &&
              o.paymentStatus === 'pending' &&
              o.status !== 'cancelled'
            ) {
              <button
                class="btn btn-outline-primary"
                [disabled]="busy()"
                (click)="action('payment_report')"
              >
                Registrar pago realizado
              </button>
            }
            @if (
              provider() && o.paymentStatus === 'confirmation_pending' && o.status !== 'cancelled'
            ) {
              <button
                class="btn btn-outline-primary"
                [disabled]="busy()"
                (click)="action('payment_confirm')"
              >
                Confirmar pago recibido
              </button>
            }
            @if (!['completed', 'cancelled'].includes(o.status)) {
              <button class="btn btn-outline-danger" (click)="pendingAction.set('cancel')">
                Cancelar pedido
              </button>
            }
          </div>
        </aside>
      </div>
      @if (pendingAction(); as a) {
        <sh-dialog
          [title]="a === 'cancel' ? 'Cancelar pedido' : 'Solicitar un ajuste'"
          (closed)="pendingAction.set('')"
          ><label class="w-100"
            >{{ a === 'cancel' ? 'Motivo de cancelación' : 'Qué necesitas ajustar'
            }}<textarea rows="4" class="form-control" [(ngModel)]="note"></textarea></label
          ><button
            class="btn mt-4"
            [class.btn-danger]="a === 'cancel'"
            [class.btn-primary]="a !== 'cancel'"
            [disabled]="note.trim().length < 5 || busy()"
            (click)="action(a)"
          >
            Confirmar
          </button></sh-dialog
        >
      }
    } @else if (!error()) {
      <div class="loading">Cargando pedido…</div>
    }
  </main>`,
})
export class OrderDetail {
  api = inject(OrdersApi);
  catalog = inject(CatalogApi);
  auth = inject(Auth);
  ui = inject(Ui);
  route = inject(ActivatedRoute);
  order = signal<Order | null>(null);
  review = signal<Review | null>(null);
  error = signal('');
  busy = signal(false);
  pendingAction = signal('');
  schedule = '';
  note = '';
  created = this.route.snapshot.queryParamMap.has('created');
  id = this.route.snapshot.paramMap.get('id')!;
  provider = computed(() => this.order()?.providerId === this.auth.user()?.id);
  canReview = computed(
    () =>
      !this.provider() &&
      (this.order()?.status === 'completed' ||
        (this.order()?.status === 'cancelled' && !!this.order()?.startedAt)),
  );
  reviewForm = inject(FormBuilder).nonNullable.group({
    rating: [5, Validators.required],
    comment: ['', [Validators.required, Validators.minLength(10)]],
  });
  constructor() {
    this.load();
  }
  load() {
    this.api.one(this.id).subscribe({
      next: (o) => {
        this.order.set(o);
        this.loadReview(o.serviceId);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  loadReview(serviceId: string) {
    this.catalog.reviews(serviceId).subscribe({
      next: (rs) => this.review.set(rs.find((r) => r.orderId === this.id) || null),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  late() {
    return (
      this.order() &&
      !['completed', 'cancelled'].includes(this.order()!.status) &&
      Date.parse(this.order()!.dueAt) < Date.now()
    );
  }
  eventName(a: string) {
    return (
      (
        {
          agreed: 'Contratación confirmada',
          start: 'Trabajo iniciado',
          deliver: 'Entrega realizada',
          complete: 'Entrega confirmada',
          adjust: 'Ajuste solicitado',
          cancel: 'Pedido cancelado',
          schedule: 'Fecha confirmada',
          payment_report: 'Pago registrado',
          payment_confirm: 'Pago confirmado',
        } as Record<string, string>
      )[a] || a
    );
  }
  action(a: string) {
    this.busy.set(true);
    this.api
      .action(this.id, a, this.note, this.schedule ? this.schedule + ':00-05:00' : '')
      .subscribe({
        next: (o) => {
          this.order.set(o);
          this.busy.set(false);
          this.pendingAction.set('');
          this.note = '';
          this.ui.announce('Pedido actualizado');
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.busy.set(false);
          this.pendingAction.set('');
        },
      });
  }
  sendReview() {
    if (this.reviewForm.invalid) return;
    this.busy.set(true);
    this.catalog.review({ orderId: this.id, ...this.reviewForm.getRawValue() }).subscribe({
      next: (r) => {
        this.review.set(r);
        this.busy.set(false);
        this.ui.announce('Reseña publicada');
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, Feedback, PrecioSolesPipe, StatusLabelPipe, LimaDatePipe],
  template: `<main class="page-width content-page">
    <nav class="breadcrumbs">
      <a routerLink="/mi-perfil">Mi perfil</a><span>/</span><span>Movimientos</span>
    </nav>
    <div class="section-heading">
      <h1>Movimientos</h1>
      <a class="btn btn-outline-primary" [href]="api.csv({ from, to, q })" download
        >Descargar CSV</a
      >
    </div>
    <div class="filter-row">
      <label
        >Buscar pedido o movimiento<input
          class="form-control"
          [(ngModel)]="q"
          placeholder="Número o servicio" /></label
      ><label>Desde<input class="form-control" type="date" [(ngModel)]="from" /></label
      ><label>Hasta<input class="form-control" type="date" [(ngModel)]="to" /></label>
    </div>
    <sh-feedback [message]="error()" />
    <div class="table-responsive">
      <table class="table table-striped table-hover management-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Servicio</th>
            <th>Pedido</th>
            <th>Tipo</th>
            <th>Importe</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          @for (p of filtered(); track p.id) {
            <tr>
              <td>{{ p.createdAt | limaDate }}</td>
              <td>
                {{ p.title }}<small>{{ p.id.slice(0, 12) }}</small>
              </td>
              <td>
                <a [routerLink]="['/pedidos', p.orderId]">{{ p.orderId.slice(0, 12) }}</a>
              </td>
              <td>{{ p.customerId === auth.user()?.id ? 'Pago' : 'Cobro' }}</td>
              <td>{{ p.amountCents | precioSoles }}</td>
              <td>{{ p.status | statusLabel }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6">
                <div class="empty-state">No hay movimientos en este período.</div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  </main>`,
})
export class Billing {
  api = inject(OrdersApi);
  auth = inject(Auth);
  items = signal<Payment[]>([]);
  error = signal('');
  q = '';
  from = '';
  to = '';
  constructor() {
    this.api
      .payments()
      .subscribe({ next: (p) => this.items.set(p), error: (e) => this.error.set(errorMessage(e)) });
  }
  filtered() {
    return this.items().filter(
      (p) =>
        (!this.from || p.createdAt.slice(0, 10) >= this.from) &&
        (!this.to || p.createdAt.slice(0, 10) <= this.to) &&
        (!this.q || `${p.title} ${p.id} ${p.orderId}`.toLowerCase().includes(this.q.toLowerCase())),
    );
  }
}
