import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  ListsApi,
  CatalogApi,
  FavoriteList,
  Service,
  Profile,
  Metrics,
  Ui,
  errorMessage,
} from '../../core/api';
import { Dialog, Feedback } from '../../shared/ui';
import { ServiceCard } from '../../shared/service-card';
@Component({
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Dialog, Feedback, ServiceCard],
  template: `<main class="page-width content-page">
    <nav class="breadcrumbs">
      <a routerLink="/">Inicio</a><span>/</span><a routerLink="/listas">Mis listas</a>
      @if (selected()) {
        <span>/</span><span>{{ selected()!.name }}</span>
      }
    </nav>
    <div class="section-heading">
      <h1>{{ selected()?.name || 'Mis listas' }}</h1>
      <button class="btn btn-primary" (click)="edit()">Crear lista</button>
    </div>
    <sh-feedback [message]="error()" />
    @if (selected(); as l) {
      <p>{{ l.description }}</p>
      <div class="d-flex gap-3 mb-4">
        <button class="text-button" (click)="edit(l)">Editar lista</button
        ><button class="text-button" (click)="share(l)">Compartir enlace</button>
        @if (l.shareToken) {
          <button class="text-button danger" (click)="revoke(l)">Revocar enlace</button>
        }
      </div>
      <div class="service-grid">
        @for (id of l.serviceIds; track id) {
          @if (service(id); as s) {
            @if (s.status === 'published') {
              <div>
                <sh-service-card
                  [service]="s"
                  [profile]="profile(s.providerId)"
                  [metrics]="metrics()[s.id]"
                /><button class="text-button muted mt-2" (click)="removeItem(l.id, s.id)">
                  Quitar de esta lista
                </button>
              </div>
            } @else {
              <div class="empty-state">
                <p>Este servicio ya no está disponible.</p>
                <button class="text-button" (click)="removeItem(l.id, id)">
                  Quitar de esta lista
                </button>
              </div>
            }
          } @else {
            <div class="empty-state">
              <p>Servicio no disponible</p>
              <button class="text-button" (click)="removeItem(l.id, id)">
                Quitar de esta lista
              </button>
            </div>
          }
        } @empty {
          <div class="empty-state">
            <h2>Aquí caben tus próximas ideas.</h2>
            <a routerLink="/servicios">Explorar servicios</a>
          </div>
        }
      </div>
    } @else {
      <div class="list-grid">
        @for (l of api.lists(); track l.id) {
          <article class="favorite-list-card">
            <a [routerLink]="['/listas', l.id]"
              ><div class="list-cover">
                @if (cover(l); as cover) {
                  <img [src]="cover" alt="" />
                } @else {
                  <img src="/assets/ilustrations/designer-desk.svg" alt="" />
                }
              </div>
              <h2>{{ l.name }}</h2></a
            >
            <p class="muted">
              {{ l.serviceIds.length }} servicios ·
              {{ l.shareToken ? 'Enlace compartido' : 'Privada' }}
            </p>
            <div class="list-actions">
              <button class="text-button" (click)="share(l)">Compartir</button
              ><button class="text-button" (click)="edit(l)">Editar</button
              ><button class="text-button danger" (click)="deleting.set(l)">Eliminar</button>
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <h2>Guarda lo que te inspira.</h2>
            <p>Crea una lista para organizar los servicios que te interesan.</p>
          </div>
        }
      </div>
    }
    @if (editing()) {
      <sh-dialog [title]="editingId ? 'Editar lista' : 'Crear lista'" (closed)="editing.set(false)"
        ><form [formGroup]="form" (ngSubmit)="save()" class="form-stack">
          <label>Nombre<input class="form-control" formControlName="name" /></label
          ><label
            >Descripción (opcional)<textarea
              class="form-control"
              formControlName="description"
            ></textarea></label
          ><sh-feedback [message]="dialogError()" /><button
            class="btn btn-primary"
            [disabled]="form.invalid"
          >
            Guardar lista
          </button>
        </form></sh-dialog
      >
    }
    @if (deleting(); as l) {
      <sh-dialog title="¿Eliminar esta lista?" (closed)="deleting.set(null)"
        ><p>Se eliminará “{{ l.name }}”. Los servicios permanecen en tus otras listas.</p>
        <button class="btn btn-danger" (click)="remove(l.id)">Eliminar lista</button></sh-dialog
      >
    }
  </main>`,
})
export class Lists {
  api = inject(ListsApi);
  catalog = inject(CatalogApi);
  route = inject(ActivatedRoute);
  router = inject(Router);
  ui = inject(Ui);
  services = signal<Service[]>([]);
  profiles = signal<Profile[]>([]);
  metrics = signal<Record<string, Metrics>>({});
  error = signal('');
  dialogError = signal('');
  editing = signal(false);
  editingId?: string;
  deleting = signal<FavoriteList | null>(null);
  form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });
  constructor() {
    this.load();
    forkJoin({
      services: this.catalog.services(),
      profiles: this.catalog.profiles(),
      metrics: this.catalog.metrics(),
    }).subscribe({
      next: (d) => {
        this.services.set(d.services);
        this.profiles.set(d.profiles);
        this.metrics.set(d.metrics);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  load() {
    this.api.load().subscribe({ error: (e) => this.error.set(errorMessage(e)) });
  }
  selected() {
    return this.api.lists().find((l) => l.id === this.route.snapshot.paramMap.get('id'));
  }
  service(id: string) {
    return this.services().find((s) => s.id === id);
  }
  profile(id: string) {
    return this.profiles().find((p) => p.userId === id);
  }
  cover(l: FavoriteList) {
    const s = this.service(l.serviceIds.at(-1) || '');
    return s?.imageIds.length ? '/api/files/' + s.imageIds[0] + '/content' : s?.cover;
  }
  edit(l?: FavoriteList) {
    this.editingId = l?.id;
    this.form.reset({ name: l?.name || '', description: l?.description || '' });
    this.dialogError.set('');
    this.editing.set(true);
  }
  save() {
    if (this.form.invalid) return;
    this.api.save(this.form.getRawValue(), this.editingId).subscribe({
      next: () => {
        this.editing.set(false);
        this.load();
      },
      error: (e) => this.dialogError.set(errorMessage(e)),
    });
  }
  remove(id: string) {
    this.api.remove(id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.load();
        this.router.navigate(['/listas']);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  removeItem(id: string, serviceId: string) {
    this.api.item(id, serviceId, true).subscribe({ error: (e) => this.error.set(errorMessage(e)) });
  }
  share(l: FavoriteList) {
    this.api.share(l.id).subscribe({
      next: (r) => {
        this.load();
        navigator.clipboard
          .writeText(location.origin + '/listas/compartida/' + r.shareToken)
          .then(() => this.ui.announce('Enlace copiado'))
          .catch(() =>
            this.error.set(
              'No se pudo copiar el enlace. Vuelve a intentar desde un navegador con acceso al portapapeles.',
            ),
          );
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  revoke(l: FavoriteList) {
    this.api.share(l.id, true).subscribe({
      next: () => {
        this.load();
        this.ui.announce('Enlace revocado');
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
@Component({
  standalone: true,
  imports: [RouterLink, Feedback, ServiceCard],
  template: `<main class="page-width content-page">
    <p class="eyebrow">LISTA COMPARTIDA</p>
    <sh-feedback [message]="error()" />
    @if (data(); as d) {
      <h1>{{ d.name }}</h1>
      <p>{{ d.description }}</p>
      <div class="service-grid mt-5">
        @for (s of d.services; track s.id) {
          <sh-service-card
            [service]="s"
            [profile]="profile(s.providerId)"
            [metrics]="metrics()[s.id]"
          />
        } @empty {
          <p>Esta lista no tiene servicios disponibles.</p>
        }
      </div>
      @if (d.unavailableCount) {
        <p class="muted mt-4">{{ d.unavailableCount }} servicio(s) ya no están disponibles.</p>
      }
    }
    <a routerLink="/servicios" class="btn btn-outline-primary mt-5">Explorar servicios</a>
  </main>`,
})
export class SharedList {
  api = inject(ListsApi);
  catalog = inject(CatalogApi);
  route = inject(ActivatedRoute);
  data = signal<{
    name: string;
    description: string;
    services: Service[];
    unavailableCount: number;
  } | null>(null);
  profiles = signal<Profile[]>([]);
  metrics = signal<Record<string, Metrics>>({});
  error = signal('');
  constructor() {
    forkJoin({
      data: this.api.shared(this.route.snapshot.paramMap.get('token')!),
      profiles: this.catalog.profiles(),
      metrics: this.catalog.metrics(),
    }).subscribe({
      next: (d) => {
        this.data.set(d.data);
        this.profiles.set(d.profiles);
        this.metrics.set(d.metrics);
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  profile(id: string) {
    return this.profiles().find((p) => p.userId === id);
  }
}
