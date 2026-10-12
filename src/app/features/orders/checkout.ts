import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrdersApi, Quote, errorMessage } from '../../core/api';
import { Feedback, PrecioSolesPipe } from '../../shared/ui';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Feedback, PrecioSolesPipe],
  template: `<main class="page-width content-page checkout-page">
    <nav class="breadcrumbs">
      <a routerLink="/servicios">Servicios</a><span>/</span><span>Confirmar contratación</span>
    </nav>
    <h1>Un paso más para empezar.</h1>
    <sh-feedback [message]="error()" />
    @if (quote(); as q) {
      <div class="checkout-grid">
        <form [formGroup]="form" (ngSubmit)="confirm()" class="form-stack">
          <section>
            <h2>Los detalles de tu pedido</h2>
            <label class="w-100"
              >¿Qué necesita saber el profesional?<textarea
                class="form-control"
                rows="5"
                formControlName="requirements"
                [class.is-invalid]="attempted() && form.controls.requirements.invalid"
                placeholder="Describe tu necesidad, objetivos y referencias."
              ></textarea>
            </label>
          </section>
          @if (q.snapshot.modality === 'presencial') {
            <section class="form-stack">
              <h2>Coordina la atención</h2>
              <label
                >Fecha y hora solicitada (Lima)<input
                  type="datetime-local"
                  class="form-control"
                  formControlName="requestedAt" /></label
              ><label
                >Dirección o punto de atención<input class="form-control" formControlName="address"
              /></label>
              <p class="small muted">El profesional confirmará la fecha en el pedido.</p>
            </section>
          }
          <section class="form-stack">
            <h2>Pago</h2>
            @if (q.snapshot.modality === 'presencial' && !offerId) {
              <label
                >Modalidad<select
                  class="form-select"
                  formControlName="paymentMode"
                  (change)="loadQuote()"
                >
                  <option value="platform">Pagar en plataforma</option>
                  <option value="onsite">Pagar presencialmente</option>
                </select></label
              >
            }
            @if (q.paymentMode === 'platform') {
              <p class="small muted">
                Demostración académica: usa el resultado de prueba. No ingreses datos financieros.
              </p>
              <label
                >Resultado de prueba<select class="form-select" formControlName="paymentResult">
                  <option value="success">Pago aprobado</option>
                  <option value="failure">Pago rechazado</option>
                </select></label
              >
            } @else {
              <p>
                El pago se coordina con el profesional y se confirma por ambas partes desde el
                pedido.
              </p>
            }
          </section>
          <button class="btn btn-primary" [disabled]="busy()">
            {{
              busy()
                ? 'Confirmando…'
                : q.paymentMode === 'platform'
                  ? 'Confirmar y pagar'
                  : 'Confirmar contratación'
            }}
          </button>
        </form>
        <aside class="summary-panel">
          <p class="eyebrow">RESUMEN DEL PEDIDO</p>
          <h2>{{ q.snapshot.title }}</h2>
          <p>{{ q.snapshot.providerName }}</p>
          <hr />
          <h3>{{ q.snapshot.packageName }}</h3>
          <p>{{ q.snapshot.scope }}</p>
          <div class="summary-row">
            <span>{{ q.snapshot.quantity }} × {{ q.snapshot.unitPriceCents | precioSoles }}</span
            ><strong>{{ q.snapshot.unitPriceCents * q.snapshot.quantity | precioSoles }}</strong>
          </div>
          @for (e of q.snapshot.extras; track e.id) {
            <div class="summary-row">
              <span>{{ e.name }}</span
              ><span>{{ e.priceCents | precioSoles }}</span>
            </div>
          }
          <p class="muted mt-3">Plazo acordado: {{ q.days }} días</p>
          <div class="total-row">
            <span>Total</span><strong>{{ q.totalCents | precioSoles }}</strong>
          </div>
        </aside>
      </div>
    } @else if (!error()) {
      <div class="loading">Preparando tu resumen…</div>
    }
  </main>`,
})
export class Checkout {
  api = inject(OrdersApi);
  router = inject(Router);
  route = inject(ActivatedRoute);
  quote = signal<Quote | null>(null);
  error = signal('');
  busy = signal(false);
  attempted = signal(false);
  key = crypto.randomUUID();
  offerId = this.route.snapshot.queryParamMap.get('offerId');
  form = inject(FormBuilder).nonNullable.group({
    requirements: ['', [Validators.required, Validators.minLength(5)]],
    requestedAt: [''],
    address: [''],
    paymentMode: ['platform'],
    paymentResult: ['success'],
  });
  constructor() {
    this.loadQuote();
  }
  body() {
    const p = this.route.snapshot.queryParamMap;
    return {
      offerId: this.offerId,
      serviceId: p.get('serviceId'),
      packageId: p.get('packageId'),
      quantity: Number(p.get('quantity') || 1),
      extraIds: (p.get('extras') || '').split(',').filter(Boolean),
      paymentMode: this.form.controls.paymentMode.value,
    };
  }
  loadQuote() {
    this.api.quote(this.body()).subscribe({
      next: (q) => {
        this.quote.set(q);
        this.error.set('');
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  confirm() {
    this.attempted.set(true);
    if (this.form.invalid) {
      this.error.set('Completa los requisitos para continuar.');
      return;
    }
    this.busy.set(true);
    const data = this.form.getRawValue();
    this.api
      .confirm({
        ...this.body(),
        ...data,
        requestedAt: data.requestedAt ? data.requestedAt + ':00-05:00' : undefined,
        idempotencyKey: this.key,
        expectedTotalCents: this.quote()!.totalCents,
      })
      .subscribe({
        next: (o) => this.router.navigate(['/pedidos', o.id], { queryParams: { created: 1 } }),
        error: (e) => {
          this.error.set(errorMessage(e));
          this.busy.set(false);
          if ((e as { status: number }).status === 409) this.loadQuote();
        },
      });
  }
}
