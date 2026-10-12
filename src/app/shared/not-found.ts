import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="page-width empty-state not-found">
    <p class="eyebrow">404</p>
    <h1>Este camino no lleva a un servicio.</h1>
    <p>Puede que el enlace haya cambiado.</p>
    <a routerLink="/servicios" class="btn btn-primary">Explorar servicios</a>
  </main>`,
})
export class NotFound {}
