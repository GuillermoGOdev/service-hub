import { describe, it, expect, afterEach } from 'vitest';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { PrecioSolesPipe, ServiceHighlightDirective, Feedback } from './shared/ui';
import { normalize } from './features/catalog/catalog';
TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
@Component({
  standalone: true,
  imports: [ServiceHighlightDirective],
  template:
    '<article appServiceHighlight><a href="/servicios">Servicio</a><button>Guardar</button></article>',
})
class CardFixture {}
afterEach(() => TestBed.resetTestingModule());
describe('precioSoles: contrato en céntimos', () => {
  const pipe = new PrecioSolesPipe();
  it('formatea 6099 céntimos como 60,99 soles, sin división doble', () => {
    expect(pipe.transform(6099)).toBe(
      new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(60.99),
    );
  });
  it('maneja cero e importes grandes', () => {
    expect(pipe.transform(0)).toContain('0.00');
    expect(pipe.transform(100000)).toContain('1,000.00');
  });
});
describe('appServiceHighlight en una tarjeta real', () => {
  it('resalta con hover y foco manteniendo el enlace y el botón independientes', async () => {
    TestBed.configureTestingModule({
      imports: [CardFixture],
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(CardFixture);
    fixture.detectChanges();
    const article = fixture.nativeElement.querySelector('article') as HTMLElement;
    article.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    expect(article.classList.contains('service-highlight')).toBe(true);
    article.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(article.classList.contains('service-highlight')).toBe(false);
    const button = article.querySelector('button')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();
    expect(article.classList.contains('service-highlight')).toBe(true);
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    fixture.detectChanges();
    expect(article.classList.contains('service-highlight')).toBe(false);
    expect(article.querySelector('a')?.getAttribute('href')).toBe('/servicios');
    expect(button.closest('a')).toBeNull();
  });
});
describe('Feedback y búsqueda', () => {
  it('la alerta NgIf solo aparece con un mensaje', () => {
    TestBed.configureTestingModule({
      imports: [Feedback],
      providers: [provideZonelessChangeDetection()],
    });
    const f = TestBed.createComponent(Feedback);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.alert')).toBeNull();
    f.componentRef.setInput('message', 'Revisa los campos');
    f.detectChanges();
    expect(f.nativeElement.querySelector('.alert-danger').textContent).toContain(
      'Revisa los campos',
    );
  });
  it('ignora mayúsculas y tildes', () => {
    expect(normalize('DISEÑO y Tecnología')).toBe('diseno y tecnologia');
  });
});
