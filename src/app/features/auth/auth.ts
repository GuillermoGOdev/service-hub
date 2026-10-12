import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Auth, Ui, errorMessage } from '../../core/api';
import { Feedback } from '../../shared/ui';
@Component({
  selector: 'sh-auth-form',
  standalone: true,
  imports: [ReactiveFormsModule, Feedback],
  template: ` <div class="auth-intro">
      <p class="eyebrow">SERVICEHUB</p>
      <h1>{{ register ? 'Las buenas ideas empiezan aquí.' : 'Qué bueno verte de nuevo.' }}</h1>
    </div>
    <form [formGroup]="form" (ngSubmit)="submit()" class="form-stack">
      @if (register) {
        <label
          >Nombre<input
            class="form-control"
            formControlName="name"
            autocomplete="name"
            [class.is-invalid]="attempted() && form.controls.name.invalid"
        /></label>
      }
      <label
        >Correo electrónico<input
          type="email"
          class="form-control"
          formControlName="email"
          autocomplete="email"
          [class.is-invalid]="attempted() && form.controls.email.invalid"
      /></label>
      <label
        >Contraseña<input
          type="password"
          class="form-control"
          formControlName="password"
          [autocomplete]="register ? 'new-password' : 'current-password'"
          [class.is-invalid]="attempted() && form.controls.password.invalid"
      /></label>
      @if (register) {
        <p class="muted small">Usa al menos 10 caracteres.</p>
        <fieldset>
          <legend class="form-label">¿Qué te gustaría hacer?</legend>
          <label class="choice"
            ><input
              type="radio"
              class="form-check-input"
              formControlName="intent"
              value="customer"
            />
            Quiero contratar</label
          ><label class="choice"
            ><input
              type="radio"
              class="form-check-input"
              formControlName="intent"
              value="provider"
            />
            Ofrecer servicios</label
          >
        </fieldset>
      }
      <sh-feedback [message]="error()" /><button class="btn btn-primary w-100" [disabled]="busy()">
        {{ busy() ? 'Un momento…' : register ? 'Crear mi cuenta' : 'Iniciar sesión' }}
      </button>
      <p class="text-center small">
        {{ register ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?' }}
        <button type="button" class="text-button" (click)="toggle()">
          {{ register ? 'Inicia sesión' : 'Regístrate' }}
        </button>
      </p>
    </form>`,
})
export class AuthForm {
  private fb = inject(FormBuilder);
  auth = inject(Auth);
  router = inject(Router);
  ui = inject(Ui);
  @Input() register = false;
  @Input() intent = 'customer';
  @Output() done = new EventEmitter<boolean>();
  busy = signal(false);
  error = signal('');
  attempted = signal(false);
  form = this.fb.nonNullable.group({
    name: ['', [Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(10)]],
    intent: ['customer'],
  });
  ngOnInit() {
    this.form.controls.intent.setValue(this.intent);
  }
  toggle() {
    this.register = !this.register;
    this.error.set('');
    this.attempted.set(false);
  }
  submit() {
    this.attempted.set(true);
    this.form.controls.name.setValidators(
      this.register ? [Validators.required, Validators.minLength(2)] : [],
    );
    this.form.controls.name.updateValueAndValidity();
    if (this.form.invalid) {
      this.error.set('Revisa los campos señalados.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const body = this.form.getRawValue();
    (this.register ? this.auth.register(body) : this.auth.login(body))
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => {
          this.done.emit(this.register);
          if (this.register)
            this.router.navigate(['/bienvenida'], { queryParams: { intent: body.intent } });
        },
        error: (e) => this.error.set(errorMessage(e)),
      });
  }
}
@Component({
  standalone: true,
  imports: [AuthForm],
  template: `<main class="auth-page">
    <div class="auth-art">
      <img src="/assets/ilustrations/conversation-businessman-customer.svg" alt="" />
      <p>Personas que saben.<br />Ideas que se hacen realidad.</p>
    </div>
    <div class="auth-content">
      <sh-auth-form [register]="register" [intent]="intent" (done)="done($event)" />
    </div>
  </main>`,
})
export class AuthPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ui = inject(Ui);
  register = this.route.snapshot.queryParamMap.get('register') === '1';
  intent = this.route.snapshot.queryParamMap.get('intent') || 'customer';
  done(registered: boolean) {
    const url = this.route.snapshot.queryParamMap.get('returnTo');
    const safe =
      url && /^\/(?!\/)/.test(url) && !url.includes('://') && !url.includes('\\')
        ? url
        : '/servicios';
    if (registered) this.ui.deferNavigation(url ? safe : '');
    else this.router.navigateByUrl(safe);
  }
}
