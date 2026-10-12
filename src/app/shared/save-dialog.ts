import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { ListsApi, Service, errorMessage } from '../core/api';
import { Dialog, Feedback } from './ui';
@Component({
  selector: 'sh-save-dialog',
  standalone: true,
  imports: [Dialog, Feedback, ReactiveFormsModule],
  template: `<sh-dialog title="Guardar en una lista" (closed)="closed.emit()"
    ><p class="muted">{{ service.title }}</p>
    <sh-feedback [message]="error()" />
    <div class="form-stack">
      @for (l of api.lists(); track l.id) {
        <label class="list-choice"
          ><input
            class="form-check-input"
            type="checkbox"
            [checked]="l.serviceIds.includes(service.id)"
            (change)="toggle(l.id, l.serviceIds.includes(service.id))"
          />{{ l.name }}</label
        >
      }
      <form [formGroup]="form" (ngSubmit)="create()">
        <label
          >Nueva lista<input
            class="form-control"
            formControlName="name"
            placeholder="Por ejemplo, Mi próximo proyecto" /></label
        ><button class="btn btn-outline-primary mt-3" [disabled]="form.invalid">
          Crear y guardar
        </button>
      </form>
      <button class="btn btn-primary" (click)="closed.emit()">Listo</button>
    </div></sh-dialog
  >`,
})
export class SaveDialog {
  @Input({ required: true }) service!: Service;
  @Output() closed = new EventEmitter<void>();
  api = inject(ListsApi);
  error = signal('');
  form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
  });
  ngOnInit() {
    this.api.load().subscribe({ error: (e) => this.error.set(errorMessage(e)) });
  }
  toggle(id: string, remove: boolean) {
    this.api
      .item(id, this.service.id, remove)
      .subscribe({ error: (e) => this.error.set(errorMessage(e)) });
  }
  create() {
    if (this.form.invalid) return;
    this.api
      .save(this.form.getRawValue())
      .pipe(
        switchMap((l) => this.api.item(l.id, this.service.id)),
        switchMap(() => this.api.load()),
      )
      .subscribe({ next: () => this.form.reset(), error: (e) => this.error.set(errorMessage(e)) });
  }
}
