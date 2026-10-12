import {
  AfterViewInit,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  Pipe,
  PipeTransform,
  ViewChild,
  inject,
} from '@angular/core';
import { NgIf } from '@angular/common';
@Pipe({ name: 'precioSoles', standalone: true })
export class PrecioSolesPipe implements PipeTransform {
  transform(cents: number | null | undefined): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(
      (Number.isFinite(cents) ? cents! : 0) / 100,
    );
  }
}
@Pipe({ name: 'limaDate', standalone: true })
export class LimaDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value
      ? new Intl.DateTimeFormat('es-PE', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/Lima',
        }).format(new Date(value))
      : 'Por coordinar';
  }
}
@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: string): string {
    return (
      (
        {
          agreed: 'Acordado',
          in_progress: 'En curso',
          delivered: 'Pendiente de confirmación',
          completed: 'Completado',
          cancelled: 'Cancelado',
          pending: 'Pendiente',
          paid: 'Pagado',
          confirmation_pending: 'Confirmación de pago pendiente',
          confirmed: 'Confirmado',
          refunded: 'Reembolsado',
          draft: 'Borrador',
          published: 'Publicado',
          paused: 'Pausado',
          accepted: 'Aceptada',
          rejected: 'Rechazada',
          withdrawn: 'Retirada',
          expired: 'Vencida',
          platform: 'En plataforma',
          onsite: 'Presencial',
        } as Record<string, string>
      )[value] || value
    );
  }
}
@Directive({
  selector: '[appServiceHighlight]',
  standalone: true,
  host: { '[class.service-highlight]': 'hovered || focused' },
})
export class ServiceHighlightDirective {
  hovered = false;
  focused = false;
  @HostListener('mouseenter') enter() {
    this.hovered = true;
  }
  @HostListener('mouseleave') leave() {
    this.hovered = false;
  }
  @HostListener('focusin') focus() {
    this.focused = true;
  }
  @HostListener('focusout', ['$event']) blur(event: FocusEvent) {
    this.focused =
      !!event.relatedTarget &&
      (event.currentTarget as HTMLElement).contains(event.relatedTarget as Node);
  }
}
@Component({
  selector: 'sh-feedback',
  standalone: true,
  imports: [NgIf],
  template: `<div
    *ngIf="message"
    class="alert"
    [class.alert-danger]="!success"
    [class.alert-success]="success"
    role="status"
  >
    {{ message }}
  </div>`,
})
export class Feedback {
  @Input() message = '';
  @Input() success = false;
}
@Component({
  selector: 'sh-icon',
  standalone: true,
  template: `<img
    [src]="'/assets/icons/' + name + '.svg'"
    alt=""
    aria-hidden="true"
    [style.width.px]="size"
    [style.height.px]="size"
  />`,
  host: { class: 'icon' },
})
export class Icon {
  @Input() name = 'akar-icons_arrow-right';
  @Input() size = 22;
}
@Component({
  selector: 'sh-avatar',
  standalone: true,
  template: `@if (fileId) {
      <img [src]="'/api/files/' + fileId + '/content'" [alt]="name" />
    } @else {
      <span aria-hidden="true">{{ name.charAt(0) }}</span>
    }`,
  host: { class: 'avatar' },
})
export class Avatar {
  @Input() name = '';
  @Input() fileId?: string;
}
@Component({
  selector: 'sh-dialog',
  standalone: true,
  template: `<dialog
    #dialog
    [class.drawer]="drawer"
    [class.compact-popover]="compact"
    [attr.aria-label]="title"
    (cancel)="cancel($event)"
    (click)="backdrop($event)"
  >
    <div class="dialog-heading">
      <h2>{{ title }}</h2>
      <button
        type="button"
        class="icon-button close-button"
        aria-label="Cerrar"
        (click)="closed.emit()"
      >
        ×
      </button>
    </div>
    <ng-content />
  </dialog>`,
})
export class Dialog implements AfterViewInit, OnDestroy {
  @Input() title = '';
  @Input() drawer = false;
  @Input() compact = false;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('dialog') element!: ElementRef<HTMLDialogElement>;
  private previous: HTMLElement | null = null;
  ngAfterViewInit() {
    this.previous = document.activeElement as HTMLElement;
    this.element.nativeElement.showModal();
  }
  ngOnDestroy() {
    this.element.nativeElement.close();
    this.previous?.focus();
  }
  cancel(e: Event) {
    e.preventDefault();
    this.closed.emit();
  }
  backdrop(e: MouseEvent) {
    if (e.target === this.element.nativeElement) {
      const b = this.element.nativeElement.getBoundingClientRect();
      if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom)
        this.closed.emit();
    }
  }
}
