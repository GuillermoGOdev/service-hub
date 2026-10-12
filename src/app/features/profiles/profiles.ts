import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Auth,
  Api,
  Ui,
  Profile,
  CatalogApi,
  MessagesApi,
  Service,
  Metrics,
  errorMessage,
} from '../../core/api';
import { Avatar, Feedback, Dialog } from '../../shared/ui';
import { ServiceCard } from '../../shared/service-card';
export const regions = [
  'Amazonas',
  'Áncash',
  'Apurímac',
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Callao',
  'Cusco',
  'Huancavelica',
  'Huánuco',
  'Ica',
  'Junín',
  'La Libertad',
  'Lambayeque',
  'Lima',
  'Loreto',
  'Madre de Dios',
  'Moquegua',
  'Pasco',
  'Piura',
  'Puno',
  'San Martín',
  'Tacna',
  'Tumbes',
  'Ucayali',
];
@Component({
  selector: 'sh-profile-form',
  standalone: true,
  imports: [ReactiveFormsModule, Feedback, Avatar],
  template: `<form [formGroup]="form" (ngSubmit)="save(activate)" class="form-stack profile-form">
    <div class="profile-photo">
      <sh-avatar
        class="large"
        [name]="form.controls.name.value"
        [fileId]="avatarId() || undefined"
      /><label
        >Foto de perfil<input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class="form-control"
          (change)="upload($event)"
      /></label>
    </div>
    <label
      >Nombre<input
        class="form-control"
        formControlName="name"
        [class.is-invalid]="attempted() && form.controls.name.invalid" /></label
    ><label
      >A qué te dedicas<input
        class="form-control"
        formControlName="headline"
        placeholder="Por ejemplo, diseño para pequeñas marcas"
        [class.is-invalid]="attempted() && form.controls.headline.invalid"
    /></label>
    <div class="row g-3">
      <label class="col-sm-6"
        >Región<select class="form-select" formControlName="region">
          <option value="">Selecciona una región</option>
          @for (r of regions; track r) {
            <option>{{ r }}</option>
          }
        </select></label
      ><label class="col-sm-6"
        >Zonas de atención (si corresponde)<input
          class="form-control"
          formControlName="zones"
          placeholder="Distritos o zonas"
      /></label>
    </div>
    <label
      >Acerca de ti<textarea
        rows="5"
        class="form-control"
        formControlName="about"
        [class.is-invalid]="attempted() && form.controls.about.invalid"
      ></textarea
      ><small class="muted"
        >Cuéntanos qué haces y cómo trabajas. Mínimo 30 caracteres.</small
      ></label
    ><label
      >Habilidades<input
        class="form-control"
        formControlName="skills"
        placeholder="Diseño, edición, comunicación"
    /></label>
    <fieldset formArrayName="languages">
      <legend>Idiomas</legend>
      @for (l of languages.controls; track l; let i = $index) {
        <div [formGroupName]="i" class="language-row">
          <select class="form-select" formControlName="name" aria-label="Idioma">
            <option>Español</option>
            <option>Inglés</option>
            <option>Quechua</option>
            <option>Aimara</option>
            <option>Portugués</option>
            <option>Francés</option></select
          ><select class="form-select" formControlName="level" aria-label="Nivel">
            <option>básico</option>
            <option>intermedio</option>
            <option>avanzado</option></select
          ><button
            type="button"
            class="text-button"
            (click)="languages.removeAt(i)"
            aria-label="Quitar idioma"
          >
            ×
          </button>
        </div>
      }
      <button type="button" class="text-button" (click)="addLanguage()">Añadir idioma</button>
    </fieldset>
    <details>
      <summary>Trayectoria y disponibilidad (opcional)</summary>
      <div class="form-stack mt-3">
        <label
          >Experiencia<textarea class="form-control" formControlName="experience"></textarea></label
        ><label
          >Educación<textarea class="form-control" formControlName="education"></textarea></label
        ><label
          >Certificaciones<textarea
            class="form-control"
            formControlName="certifications"
          ></textarea></label
        ><label
          >Días y horario disponibles<input
            class="form-control"
            formControlName="availability"
            placeholder="Lunes a viernes, 09:00–18:00"
        /></label>
      </div>
    </details>
    <sh-feedback [message]="error()" />
    <div class="form-actions">
      <button
        type="button"
        class="btn btn-outline-primary"
        [disabled]="busy()"
        (click)="save(false)"
      >
        Guardar progreso</button
      ><button class="btn btn-primary" [disabled]="busy()">
        {{ busy() ? 'Guardando…' : activate ? 'Completar perfil' : 'Guardar cambios' }}
      </button>
    </div>
  </form>`,
})
export class ProfileForm {
  @Input() activate = false;
  @Output() saved = new EventEmitter<boolean>();
  auth = inject(Auth);
  api = inject(Api);
  ui = inject(Ui);
  fb = inject(FormBuilder);
  regions = regions;
  avatarId = signal('');
  error = signal('');
  busy = signal(false);
  attempted = signal(false);
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    headline: ['', [Validators.required, Validators.minLength(5)]],
    region: ['', Validators.required],
    zones: [''],
    about: ['', [Validators.required, Validators.minLength(30)]],
    skills: ['', Validators.required],
    experience: [''],
    education: [''],
    certifications: [''],
    availability: [''],
    languages: this.fb.array([this.language()]),
  });
  language(name = 'Español', level = 'avanzado') {
    return this.fb.nonNullable.group({
      name: [name, Validators.required],
      level: [level, Validators.required],
    });
  }
  get languages() {
    return this.form.controls.languages;
  }
  addLanguage() {
    if (this.languages.length < 8) this.languages.push(this.language('Inglés', 'básico'));
  }
  ngOnInit() {
    this.auth.profile().subscribe({
      next: (p) => {
        this.form.patchValue({ ...p, skills: p.skills.join(', ') });
        this.avatarId.set(p.avatarId || '');
        this.languages.clear();
        p.languages.forEach((l) => this.languages.push(this.language(l.name, l.level)));
        if (!p.languages.length) this.languages.push(this.language());
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  upload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.busy.set(true);
    this.api.upload(file).subscribe({
      next: (f) => {
        this.avatarId.set(f.id);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
  save(complete: boolean) {
    this.attempted.set(complete);
    if (
      (complete || this.auth.user()?.providerEnabled) &&
      (this.form.invalid || !this.languages.length)
    ) {
      this.error.set(
        'Completa nombre, titular, región, presentación, habilidades y al menos un idioma.',
      );
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.auth
      .saveProfile({
        ...v,
        skills: v.skills
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        avatarId: this.avatarId() || undefined,
        complete,
      })
      .subscribe({
        next: (p) => {
          this.ui.announce(
            p.completed ? 'Perfil guardado' : 'Progreso guardado. Puedes retomarlo después.',
          );
          this.busy.set(false);
          this.saved.emit(p.completed);
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
  imports: [RouterLink, ProfileForm, FormsModule],
  template: `<main class="page-width onboarding content-page">
    <nav class="breadcrumbs"><a routerLink="/">Inicio</a><span>/</span><span>Bienvenida</span></nav>
    @if (!provider()) {
      <div class="welcome">
        <p class="eyebrow">TU PRÓXIMO PASO</p>
        <h1>Hola, {{ auth.user()?.name }}.<br />¿Qué te trae por aquí?</h1>
        <div class="intent-grid">
          <button class="intent-card" (click)="ui.finishOnboarding()">
            <img src="/assets/ilustrations/designer-desk.svg" alt="" />
            <h2>Quiero contratar</h2>
            <p>Encuentra a la persona para tu próximo proyecto.</p>
            <span>Explorar servicios →</span></button
          ><button class="intent-card" (click)="provider.set(true)">
            <img src="/assets/ilustrations/business-presentation.svg" alt="" />
            <h2>Ofrecer servicios</h2>
            <p>Comparte lo que sabes hacer y conecta con clientes.</p>
            <span>Completar mi perfil →</span>
          </button>
        </div>
      </div>
    } @else {
      <div class="narrow">
        <p class="eyebrow">TU PERFIL PROFESIONAL</p>
        <h1>Muéstranos lo que sabes hacer.</h1>
        <p class="muted mb-5">Puedes guardar tu progreso y volver cuando quieras.</p>
        <sh-profile-form [activate]="true" (saved)="finish($event)" />
        <div class="onboarding-back">
          <button class="text-button" (click)="provider.set(false)">← Atrás</button
          ><a routerLink="/servicios">Continuar explorando</a>
        </div>
      </div>
    }
  </main>`,
})
export class Onboarding {
  auth = inject(Auth);
  ui = inject(Ui);
  router = inject(Router);
  route = inject(ActivatedRoute);
  provider = signal(this.route.snapshot.queryParamMap.get('intent') === 'provider');
  finish(complete: boolean) {
    if (complete) this.ui.finishOnboarding('/mis-servicios');
  }
}
@Component({
  standalone: true,
  imports: [RouterLink, Dialog, ProfileForm, Avatar, Feedback],
  template: `<main class="page-width content-page">
    <nav class="breadcrumbs"><a routerLink="/">Inicio</a><span>/</span><span>Mi perfil</span></nav>
    <div class="section-heading">
      <h1>Mi perfil</h1>
      <button class="btn btn-primary" (click)="editing.set(true)">Editar perfil</button>
    </div>
    <sh-feedback [message]="error()" />
    @if (profile(); as p) {
      <section class="profile-panel">
        <sh-avatar class="large" [name]="p.name" [fileId]="p.avatarId" />
        <div>
          <h2>{{ p.name }}</h2>
          <p>{{ p.headline || 'Cuéntanos a qué te dedicas' }}</p>
          <span class="muted">{{ p.region }}</span>
        </div>
      </section>
      <div class="profile-content">
        <section>
          <h2>Acerca de ti</h2>
          <p class="preserve-lines">{{ p.about || 'Todavía no añadiste una presentación.' }}</p>
          <div class="chips">
            @for (s of p.skills; track s) {
              <span class="chip">{{ s }}</span>
            }
          </div>
        </section>
        <section>
          <h2>Idiomas y disponibilidad</h2>
          @for (l of p.languages; track l.name) {
            <p>{{ l.name }} · {{ l.level }}</p>
          }
          <p>{{ p.availability || 'Sin horario definido' }}</p>
        </section>
      </div>
      @if (!auth.user()?.providerEnabled) {
        <a
          routerLink="/bienvenida"
          [queryParams]="{ intent: 'provider' }"
          class="btn btn-outline-primary"
          >Activar mi perfil profesional</a
        >
      }
    }
    @if (editing()) {
      <sh-dialog title="Editar mi perfil" [drawer]="true" (closed)="editing.set(false)"
        ><sh-profile-form (saved)="editing.set(false); load()"
      /></sh-dialog>
    }
  </main>`,
})
export class MyProfile {
  auth = inject(Auth);
  profile = signal<Profile | null>(null);
  editing = signal(false);
  error = signal('');
  constructor() {
    this.load();
  }
  load() {
    this.auth.profile().subscribe({
      next: (p) => this.profile.set(p),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
}
@Component({
  standalone: true,
  imports: [RouterLink, Avatar, Feedback, ServiceCard],
  template: `<main class="page-width content-page">
    <nav class="breadcrumbs">
      <a routerLink="/">Inicio</a><span>/</span><a routerLink="/servicios">Profesionales</a>
    </nav>
    <sh-feedback [message]="error()" />
    @if (profile(); as p) {
      <section class="public-profile">
        <sh-avatar class="large" [name]="p.name" [fileId]="p.avatarId" />
        <div>
          <h1>{{ p.name }}</h1>
          <h2>{{ p.headline }}</h2>
          <p class="muted">{{ p.region }} · {{ p.availability }}</p>
          <button
            class="btn btn-primary"
            [disabled]="p.userId === auth.user()?.id"
            (click)="contact()"
          >
            Contactar
          </button>
        </div>
      </section>
      <div class="profile-content">
        <section>
          <h2>Acerca de {{ p.name }}</h2>
          <p class="preserve-lines">{{ p.about }}</p>
          <div class="chips">
            @for (s of p.skills; track s) {
              <span class="chip">{{ s }}</span>
            }
          </div>
          @if (p.experience) {
            <h3 class="mt-4">Experiencia</h3>
            <p>{{ p.experience }}</p>
          }
          @if (p.education) {
            <h3>Educación</h3>
            <p>{{ p.education }}</p>
          }
          @if (p.certifications) {
            <h3>Certificaciones</h3>
            <p>{{ p.certifications }}</p>
          }
        </section>
        <aside>
          <h3>Idiomas</h3>
          @for (l of p.languages; track l.name) {
            <p>{{ l.name }} · {{ l.level }}</p>
          }
        </aside>
      </div>
      <h2 class="mb-4">Servicios de {{ p.name }}</h2>
      <div class="service-grid">
        @for (s of services(); track s.id) {
          <sh-service-card [service]="s" [profile]="p" [metrics]="metrics()[s.id]" />
        } @empty {
          <p class="muted">Aún no hay servicios publicados.</p>
        }
      </div>
    }
  </main>`,
})
export class PublicProfile {
  api = inject(CatalogApi);
  messages = inject(MessagesApi);
  auth = inject(Auth);
  ui = inject(Ui);
  router = inject(Router);
  route = inject(ActivatedRoute);
  profile = signal<Profile | null>(null);
  services = signal<Service[]>([]);
  metrics = signal<Record<string, Metrics>>({});
  error = signal('');
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((p) =>
          forkJoin({
            person: this.api.person(p.get('id')!),
            services: this.api.services({ providerId: p.get('id')!, status: 'published' }),
            metrics: this.api.metrics(),
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (d) => {
          this.profile.set(d.person.profile);
          this.services.set(d.services);
          this.metrics.set(d.metrics);
          if (!d.person.profile)
            this.error.set('Esta persona aún no tiene un perfil profesional público.');
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
  contact() {
    this.ui.access(() =>
      this.messages.open(this.profile()!.userId).subscribe({
        next: (c) => this.router.navigate(['/mensajes', c.id]),
        error: (e) => this.error.set(errorMessage(e)),
      }),
    );
  }
}
