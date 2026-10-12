import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  CatalogApi,
  Api,
  Auth,
  Ui,
  Service,
  Category,
  ServiceType,
  errorMessage,
} from '../../core/api';
import { Feedback, Dialog, PrecioSolesPipe, StatusLabelPipe } from '../../shared/ui';
@Component({
  standalone: true,
  imports: [RouterLink, Feedback, Dialog, PrecioSolesPipe, StatusLabelPipe],
  template: `<main class="page-width content-page">
    <nav class="breadcrumbs">
      <a routerLink="/">Inicio</a><span>/</span><span>Mis servicios</span>
    </nav>
    <div class="section-heading">
      <h1>Mis servicios</h1>
      <a routerLink="/servicios/nuevo" class="btn btn-primary">Crear servicio</a>
    </div>
    <sh-feedback [message]="error()" />
    @if (loading()) {
      <p role="status">Cargando servicios…</p>
    }
    <div class="table-responsive">
      <table class="table table-striped table-hover management-table">
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Estado</th>
            <th>Desde</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (s of services(); track s.id) {
            <tr>
              <td>
                <a [routerLink]="['/servicios', s.id]">{{ s.title }}</a
                ><small>{{ s.modality }}</small>
              </td>
              <td>
                <span class="badge-soft">{{ s.status | statusLabel }}</span>
              </td>
              <td>{{ s.packages[0].priceCents | precioSoles }}</td>
              <td>
                <div class="d-flex flex-wrap gap-2">
                  <a
                    class="btn btn-sm btn-outline-primary"
                    [routerLink]="['/servicios', s.id, 'editar']"
                    >Editar</a
                  ><button class="btn btn-sm btn-outline-primary" (click)="toggle(s)">
                    {{ s.status === 'published' ? 'Pausar' : 'Publicar' }}
                  </button>
                  @if (s.status === 'draft') {
                    <button class="btn btn-sm btn-danger" (click)="deleting.set(s)">
                      Eliminar
                    </button>
                  }
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4">
                <div class="empty-state">
                  <h2>Tu primer servicio empieza aquí.</h2>
                  <p>Publica lo que sabes hacer y empieza a conectar.</p>
                  <a routerLink="/servicios/nuevo" class="btn btn-primary">Crear servicio</a>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    @if (deleting(); as s) {
      <sh-dialog title="¿Eliminar este borrador?" (closed)="deleting.set(null)"
        ><p>{{ s.title }}</p>
        <div class="form-actions">
          <button class="btn btn-outline-primary" (click)="deleting.set(null)">Conservar</button
          ><button class="btn btn-danger" (click)="remove(s)">Eliminar borrador</button>
        </div></sh-dialog
      >
    }
  </main>`,
})
export class MyServices {
  api = inject(CatalogApi);
  auth = inject(Auth);
  ui = inject(Ui);
  services = signal<Service[]>([]);
  loading = signal(true);
  error = signal('');
  deleting = signal<Service | null>(null);
  constructor() {
    this.load();
  }
  load() {
    this.api.services({ providerId: this.auth.user()!.id }).subscribe({
      next: (s) => {
        this.services.set(s);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.loading.set(false);
      },
    });
  }
  toggle(s: Service) {
    this.api.save({ status: s.status === 'published' ? 'paused' : 'published' }, s.id).subscribe({
      next: () => {
        this.load();
        this.ui.announce('Estado actualizado');
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  remove(s: Service) {
    this.api.remove(s.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.load();
      },
      error: (e) => {
        this.deleting.set(null);
        this.error.set(errorMessage(e));
      },
    });
  }
}
@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Feedback, PrecioSolesPipe],
  template: `<main class="page-width content-page editor-page">
    <nav class="breadcrumbs">
      <a routerLink="/mis-servicios">Mis servicios</a><span>/</span
      ><span>{{ id ? 'Editar' : 'Crear' }} servicio</span>
    </nav>
    <div class="section-heading">
      <h1>{{ id ? 'Dale forma a tu servicio.' : 'Comparte lo que sabes hacer.' }}</h1>
      <span class="muted">{{ step() + 1 }} de 4</span>
    </div>
    <div class="step-tabs">
      @for (
        label of ['Información', 'Galería', 'Paquetes', 'Revisión'];
        track label;
        let i = $index
      ) {
        <button [class.selected]="step() === i" (click)="step.set(i)">
          {{ i + 1 }}. {{ label }}
        </button>
      }
    </div>
    <form [formGroup]="form" (ngSubmit)="save('published')">
      <sh-feedback [message]="error()" />
      <section [hidden]="step() !== 0" class="form-stack">
        <label
          >Título del servicio<input
            class="form-control"
            formControlName="title"
            [class.is-invalid]="attempted() && form.controls.title.invalid"
            placeholder="Describe el resultado que ofreces"
        /></label>
        <div class="row g-3">
          <label class="col-md-6"
            >Categoría<select
              class="form-select"
              formControlName="categoryId"
              (change)="categoryChanged()"
            >
              <option value="">Selecciona</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select></label
          ><label class="col-md-6"
            >Tipo de servicio<select class="form-select" formControlName="typeId">
              <option value="">Selecciona</option>
              @for (t of types(); track t.id) {
                @if (t.categoryId === form.controls.categoryId.value) {
                  <option [value]="t.id">{{ t.name }}</option>
                }
              }
            </select></label
          >
        </div>
        <div class="row g-3">
          <label class="col-md-6"
            >Modalidad<select class="form-select" formControlName="modality">
              <option value="digital">Digital</option>
              <option value="presencial">Presencial</option>
            </select></label
          ><label class="col-md-6"
            >Etiquetas<input
              class="form-control"
              formControlName="tags"
              placeholder="Separa cada etiqueta con una coma"
          /></label>
        </div>
        @if (form.controls.modality.value === 'presencial') {
          <div class="row g-3">
            <label class="col-md-6"
              >Región<input class="form-control" formControlName="region" /></label
            ><label class="col-md-6"
              >Zonas de atención<input class="form-control" formControlName="zones"
            /></label>
          </div>
        }
        <label
          >Descripción<textarea
            class="form-control"
            rows="7"
            formControlName="description"
            [class.is-invalid]="attempted() && form.controls.description.invalid"
          ></textarea></label
        ><label
          >Qué necesitas del cliente<textarea
            class="form-control"
            rows="3"
            formControlName="requirements"
          ></textarea>
        </label>
        <fieldset formArrayName="faq">
          <legend>Preguntas frecuentes</legend>
          @for (f of faq.controls; track f; let i = $index) {
            <div class="nested-form" [formGroupName]="i">
              <label>Pregunta<input class="form-control" formControlName="question" /></label
              ><label
                >Respuesta<textarea class="form-control" formControlName="answer"></textarea></label
              ><button type="button" class="text-button danger" (click)="faq.removeAt(i)">
                Quitar pregunta
              </button>
            </div>
          }
          <button type="button" class="btn btn-outline-primary" (click)="addFaq()">
            Añadir pregunta
          </button>
        </fieldset>
      </section>
      <section [hidden]="step() !== 1" class="form-stack">
        <h2>Muestra tu trabajo</h2>
        <p class="muted">
          La primera imagen será tu portada. PNG, JPEG o WebP, hasta 5 MB por imagen. Máximo seis.
        </p>
        <label
          >Subir imagen<input
            class="form-control"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            (change)="upload($event)"
            [disabled]="imageIds().length >= 6 || busy()"
        /></label>
        <div class="upload-gallery">
          @for (img of imageIds(); track img; let i = $index) {
            <div>
              <img [src]="'/api/files/' + img + '/content'" [alt]="'Imagen ' + (i + 1)" />
              <div>
                <button type="button" class="text-button" (click)="makeCover(img)">
                  Usar de portada</button
                ><button type="button" class="text-button danger" (click)="removeImage(img)">
                  Quitar
                </button>
              </div>
            </div>
          }
        </div>
        @if (!imageIds().length) {
          <div class="empty-state">
            Usaremos una ilustración provisional hasta que añadas tus imágenes.
          </div>
        }
      </section>
      <section [hidden]="step() !== 2" class="form-stack">
        <div class="packages-editor" formArrayName="packages">
          @for (p of packages.controls; track p; let i = $index) {
            <section class="package-editor form-stack" [formGroupName]="i">
              <h2>{{ ['Básico', 'Estándar', 'Premium'][i] }}</h2>
              <label
                >Alcance<textarea
                  class="form-control"
                  formControlName="scope"
                  rows="3"
                ></textarea></label
              ><label
                >Precio (S/)<input
                  type="number"
                  min="1"
                  step="0.01"
                  class="form-control"
                  formControlName="price" /></label
              ><label
                >Unidad<select class="form-select" formControlName="unit">
                  <option value="proyecto">Proyecto</option>
                  <option value="hora">Hora</option>
                  <option value="visita">Visita</option>
                </select></label
              ><label
                >Plazo en días<input
                  type="number"
                  min="1"
                  max="365"
                  class="form-control"
                  formControlName="days"
              /></label>
              @if (form.controls.modality.value === 'digital') {
                <label
                  >Revisiones<input
                    type="number"
                    min="0"
                    max="50"
                    class="form-control"
                    formControlName="revisions"
                /></label>
              }
              <label
                >Contratación<select class="form-select" formControlName="bookingMode">
                  <option value="direct">Directa</option>
                  <option value="request">Por solicitud</option>
                </select></label
              ><label
                >Características incluidas<textarea
                  class="form-control"
                  formControlName="features"
                  placeholder="Una por línea"
                ></textarea>
              </label>
            </section>
          }
        </div>
        <fieldset formArrayName="extras">
          <legend>Extras opcionales</legend>
          @for (e of extras.controls; track e; let i = $index) {
            <div class="nested-form" [formGroupName]="i">
              <label>Nombre<input class="form-control" formControlName="name" /></label>
              <div class="row g-3">
                <label class="col"
                  >Precio (S/)<input
                    type="number"
                    class="form-control"
                    formControlName="price"
                    min="1"
                    step="0.01" /></label
                ><label class="col"
                  >Días adicionales<input
                    type="number"
                    class="form-control"
                    formControlName="days"
                    min="0"
                /></label>
              </div>
              <button type="button" class="text-button danger" (click)="extras.removeAt(i)">
                Quitar extra
              </button>
            </div>
          }
          <button type="button" class="btn btn-outline-primary" (click)="addExtra()">
            Añadir extra
          </button>
        </fieldset>
      </section>
      <section [hidden]="step() !== 3" class="form-stack preview-panel">
        <p class="eyebrow">VISTA PREVIA</p>
        <h2>{{ form.controls.title.value || 'Tu servicio' }}</h2>
        <p class="preserve-lines">{{ form.controls.description.value }}</p>
        <div class="packages-editor">
          @for (p of packages.controls; track p; let i = $index) {
            <div class="package-editor">
              <h3>{{ ['Básico', 'Estándar', 'Premium'][i] }}</h3>
              <p>{{ p.controls.scope.value }}</p>
              <strong>{{ p.controls.price.value * 100 | precioSoles }}</strong>
              <p>{{ p.controls.days.value }} días</p>
            </div>
          }
        </div>
        <p class="muted">Revisa el alcance, los requisitos y las imágenes antes de publicar.</p>
      </section>
      <div class="editor-actions">
        <a class="btn btn-outline-secondary" routerLink="/mis-servicios">Volver</a
        ><button
          type="button"
          class="btn btn-outline-primary"
          (click)="save('draft')"
          [disabled]="busy()"
        >
          Guardar borrador
        </button>
        @if (step() < 3) {
          <button type="button" class="btn btn-primary" (click)="next()">Continuar</button>
        } @else {
          <button class="btn btn-primary" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Publicar servicio' }}
          </button>
        }
      </div>
    </form>
  </main>`,
})
export class ServiceEditor {
  fb = inject(FormBuilder);
  api = inject(CatalogApi);
  files = inject(Api);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ui = inject(Ui);
  id = this.route.snapshot.paramMap.get('id') || undefined;
  categories = signal<Category[]>([]);
  types = signal<ServiceType[]>([]);
  step = signal(0);
  error = signal('');
  busy = signal(false);
  attempted = signal(false);
  imageIds = signal<string[]>([]);
  original?: Service;
  package(i: number) {
    return this.fb.nonNullable.group({
      scope: ['', [Validators.required, Validators.minLength(10)]],
      price: [60 * (i + 1), [Validators.required, Validators.min(1)]],
      unit: ['proyecto'],
      days: [3 + i * 2, [Validators.required, Validators.min(1)]],
      revisions: [1],
      bookingMode: [i === 0 ? 'direct' : 'request'],
      features: ['Coordinación inicial\nEntrega del alcance acordado'],
    });
  }
  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(6)]],
    categoryId: ['', Validators.required],
    typeId: ['', Validators.required],
    tags: [''],
    modality: ['digital'],
    region: [''],
    zones: [''],
    description: ['', [Validators.required, Validators.minLength(30)]],
    requirements: ['', [Validators.required, Validators.minLength(5)]],
    packages: this.fb.array([this.package(0), this.package(1), this.package(2)]),
    extras: this.fb.array<ReturnType<ServiceEditor['extra']>>([]),
    faq: this.fb.array<ReturnType<ServiceEditor['question']>>([]),
  });
  get packages() {
    return this.form.controls.packages;
  }
  get extras() {
    return this.form.controls.extras;
  }
  get faq() {
    return this.form.controls.faq;
  }
  extra() {
    return this.fb.nonNullable.group({
      id: [''],
      name: ['', Validators.required],
      price: [25, [Validators.required, Validators.min(1)]],
      days: [0, [Validators.required, Validators.min(0)]],
    });
  }
  question() {
    return this.fb.nonNullable.group({
      question: ['', Validators.required],
      answer: ['', Validators.required],
    });
  }
  addExtra() {
    if (this.extras.length < 10) this.extras.push(this.extra());
  }
  addFaq() {
    if (this.faq.length < 10) this.faq.push(this.question());
  }
  constructor() {
    forkJoin({ categories: this.api.categories(), types: this.api.types() }).subscribe({
      next: (d) => {
        this.categories.set(d.categories);
        this.types.set(d.types);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
    if (this.id)
      this.api.service(this.id).subscribe({
        next: (s) => {
          this.original = s;
          this.form.patchValue({
            ...s,
            packages: [],
            extras: [],
            faq: [],
            tags: s.tags.join(', '),
          });
          s.packages.forEach((p, i) =>
            this.packages
              .at(i)
              .patchValue({ ...p, price: p.priceCents / 100, features: p.features.join('\n') }),
          );
          s.extras.forEach((e) => {
            const f = this.extra();
            f.patchValue({ ...e, price: e.priceCents / 100 });
            this.extras.push(f);
          });
          s.faq.forEach((q) => {
            const f = this.question();
            f.patchValue(q);
            this.faq.push(f);
          });
          this.imageIds.set(s.imageIds);
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  categoryChanged() {
    this.form.controls.typeId.setValue(
      this.types().find((t) => t.categoryId === this.form.controls.categoryId.value)?.id || '',
    );
  }
  next() {
    this.attempted.set(true);
    if (
      this.step() === 0 &&
      ['title', 'categoryId', 'typeId', 'description', 'requirements'].some(
        (k) => this.form.get(k)?.invalid,
      )
    ) {
      this.error.set('Completa la información del servicio antes de continuar.');
      return;
    }
    this.error.set('');
    this.step.set(this.step() + 1);
    window.scrollTo(0, 0);
  }
  upload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.files.upload(file).subscribe({
      next: (f) => {
        this.imageIds.update((ids) => [...ids, f.id]);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
  makeCover(id: string) {
    this.imageIds.update((ids) => [id, ...ids.filter((x) => x !== id)]);
  }
  removeImage(id: string) {
    this.imageIds.update((ids) => ids.filter((x) => x !== id));
  }
  save(status: Service['status']) {
    this.attempted.set(true);
    if (status === 'published' && this.form.invalid) {
      this.error.set(
        'Revisa los campos: título, categoría, descripción, requisitos y alcance de cada paquete.',
      );
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      ...v,
      status,
      tags: v.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      imageIds: this.imageIds(),
      packages: v.packages.map((p, i) => ({
        ...p,
        id: `paquete-${i + 1}`,
        name: ['Básico', 'Estándar', 'Premium'][i],
        priceCents: Math.round(p.price * 100),
        features: p.features.split('\n').filter(Boolean),
      })),
      extras: v.extras.map((e) => ({ ...e, priceCents: Math.round(e.price * 100) })),
    } as unknown as Partial<Service>;
    this.busy.set(true);
    this.api.save(body, this.id).subscribe({
      next: () => {
        this.ui.announce(status === 'published' ? 'Servicio publicado' : 'Borrador guardado');
        this.router.navigate(['/mis-servicios']);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
}
