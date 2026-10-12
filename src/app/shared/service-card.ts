import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Service, Profile, Metrics, Ui, ListsApi } from '../core/api';
import { Avatar, Icon, PrecioSolesPipe, ServiceHighlightDirective } from './ui';
@Component({
  selector: 'sh-service-card',
  standalone: true,
  imports: [RouterLink, Avatar, Icon, PrecioSolesPipe, ServiceHighlightDirective],
  template: ` <article class="service-card" appServiceHighlight>
    <a
      class="service-cover"
      [routerLink]="['/servicios', service.id]"
      [queryParams]="returnTo ? { from: returnTo } : {}"
      [style.background]="color"
      ><img
        [src]="
          service.imageIds.length ? '/api/files/' + service.imageIds[0] + '/content' : service.cover
        "
        [alt]="service.title"
        loading="lazy"
        [class.illustrated]="!service.imageIds.length"
    /></a>
    <div class="provider-row">
      <a class="provider-link" [routerLink]="['/profesionales', service.providerId]"
        ><sh-avatar [name]="profile?.name || 'Profesional'" [fileId]="profile?.avatarId" /><span
          ><span
            class="level"
            [class.level-top]="metrics?.level === 'Top Rated'"
            [class.level-two]="metrics?.level === 'Nivel 2'"
            >{{ metrics?.level || 'Nuevo' }}</span
          ><span class="provider-name">{{ profile?.name || 'Profesional' }}</span></span
        ></a
      ><button
        class="icon-button favorite"
        [class.saved]="isSaved()"
        [attr.aria-label]="'Guardar ' + service.title + ' en listas'"
        [attr.aria-pressed]="isSaved()"
        (click)="ui.saved(service)"
      >
        <sh-icon name="akar-icons_heart" />
      </button>
    </div>
    <a
      class="service-title"
      [routerLink]="['/servicios', service.id]"
      [queryParams]="returnTo ? { from: returnTo } : {}"
      >{{ service.title }}</a
    >
    <div class="card-stat">
      <sh-icon name="akar-icons_star" [size]="20" />
      @if (metrics?.reviewCount) {
        <strong>{{ metrics!.rating.toFixed(1) }}</strong
        ><span class="muted">({{ metrics!.reviewCount }})</span>
      } @else {
        <span class="muted">Sin reseñas</span>
      }
    </div>
    <div class="card-stat">
      <sh-icon name="jam_coin" [size]="21" /><strong
        >Desde {{ service.packages[0].priceCents | precioSoles }}</strong
      ><span class="muted">/ {{ service.packages[0].unit }}</span>
    </div>
  </article>`,
})
export class ServiceCard {
  @Input({ required: true }) service!: Service;
  @Input() profile?: Profile;
  @Input() metrics?: Metrics;
  @Input() returnTo = '';
  @Input() color = '#f3f3f7';
  ui = inject(Ui);
  lists = inject(ListsApi);
  isSaved() {
    return this.lists.lists().some((l) => l.serviceIds.includes(this.service.id));
  }
}
