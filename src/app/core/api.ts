import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, of, tap } from 'rxjs';
import { CanActivateFn, Router } from '@angular/router';
import {
  User,
  Profile,
  Service,
  Category,
  ServiceType,
  Metrics,
  Review,
  Conversation,
  Message,
  Offer,
  Order,
  Payment,
  FavoriteList,
  Notification,
  Preference,
  ConversationLabel,
  FileRecord,
} from '../../../shared/models';
export * from '../../../shared/models';
export function errorMessage(e: unknown): string {
  return (
    (e as { error?: { message?: string } })?.error?.message ||
    'No se pudo conectar. Comprueba que la API esté encendida e inténtalo otra vez.'
  );
}
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  get<T>(path: string, params: Record<string, string | number | boolean> = {}) {
    return this.http.get<T>('/api' + path, { params });
  }
  post<T>(path: string, body: unknown) {
    return this.http.post<T>('/api' + path, body);
  }
  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>('/api' + path, body);
  }
  put<T>(path: string, body: unknown) {
    return this.http.put<T>('/api' + path, body);
  }
  delete(path: string) {
    return this.http.delete<void>('/api' + path);
  }
  upload(file: File, conversationId?: string) {
    const body = new FormData();
    body.append('image', file);
    if (conversationId) body.append('conversationId', conversationId);
    return this.post<FileRecord>('/files', body);
  }
}
@Injectable({ providedIn: 'root' })
export class Auth {
  private api = inject(Api);
  user = signal<User | null>(null);
  ready = signal(false);
  refresh() {
    return this.api.get<User | null>('/auth/me').pipe(
      tap((u) => {
        this.user.set(u);
        this.ready.set(true);
      }),
    );
  }
  login(body: unknown) {
    return this.api.post<User>('/auth/login', body).pipe(tap((u) => this.user.set(u)));
  }
  register(body: unknown) {
    return this.api.post<User>('/auth/register', body).pipe(tap((u) => this.user.set(u)));
  }
  logout() {
    return this.api.post<void>('/auth/logout', {}).pipe(tap(() => this.user.set(null)));
  }
  profile() {
    return this.api.get<Profile>('/account/profile');
  }
  saveProfile(body: unknown) {
    return this.api
      .put<Profile>('/account/profile', body)
      .pipe(
        tap((p) =>
          this.user.update((u) => (u ? { ...u, name: p.name, providerEnabled: p.completed } : u)),
        ),
      );
  }
}
export const signedIn: CanActivateFn = (_, state) => {
  const auth = inject(Auth),
    router = inject(Router);
  return auth.refresh().pipe(
    map((u) =>
      u ? true : router.createUrlTree(['/acceso'], { queryParams: { returnTo: state.url } }),
    ),
    catchError(() => of(router.createUrlTree(['/acceso']))),
  );
};
export const providerOnly: CanActivateFn = () => {
  const auth = inject(Auth),
    router = inject(Router);
  return auth.refresh().pipe(
    map((u) =>
      u?.providerEnabled
        ? true
        : router.createUrlTree([u ? '/bienvenida' : '/acceso'], {
            queryParams: { intent: 'provider' },
          }),
    ),
    catchError(() => of(router.createUrlTree(['/acceso']))),
  );
};
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private api = inject(Api);
  services(params: Record<string, string> = {}) {
    return this.api.get<Service[]>('/services', params);
  }
  service(id: string) {
    return this.api.get<Service>('/services/' + id);
  }
  categories() {
    return this.api.get<Category[]>('/categories');
  }
  types() {
    return this.api.get<ServiceType[]>('/serviceTypes');
  }
  profiles() {
    return this.api.get<Profile[]>('/providerProfiles');
  }
  person(id: string) {
    return this.api.get<{ id: string; name: string; createdAt: string; profile: Profile | null }>(
      '/people/' + id,
    );
  }
  metrics() {
    return this.api.get<Record<string, Metrics>>('/metrics');
  }
  reviews(serviceId: string) {
    return this.api.get<Review[]>('/reviews', { serviceId, _sort: 'createdAt', _order: 'desc' });
  }
  save(body: Partial<Service>, id?: string) {
    return id
      ? this.api.patch<Service>('/services/' + id, body)
      : this.api.post<Service>('/services', body);
  }
  remove(id: string) {
    return this.api.delete('/services/' + id);
  }
  review(body: unknown) {
    return this.api.post<Review>('/reviews', body);
  }
  respond(id: string, response: string) {
    return this.api.patch<Review>('/reviews/' + id, { response });
  }
}
@Injectable({ providedIn: 'root' })
export class MessagesApi {
  private api = inject(Api);
  conversations() {
    return this.api.get<Conversation[]>('/conversations', { _sort: 'updatedAt', _order: 'desc' });
  }
  messages(conversationId: string) {
    return this.api.get<Message[]>('/messages', {
      conversationId,
      _sort: 'createdAt',
      _order: 'asc',
    });
  }
  open(providerId: string) {
    return this.api.post<Conversation>('/conversations/open', { providerId });
  }
  send(body: unknown) {
    return this.api.post<Message>('/messages', body);
  }
  request(body: unknown) {
    return this.api.post<{ conversationId: string }>('/requests', body);
  }
  offers(conversationId: string) {
    return this.api.get<Offer[]>('/offers', { conversationId });
  }
  offer(id: string) {
    return this.api.get<Offer>('/offers/' + id);
  }
  createOffer(body: unknown) {
    return this.api.post<Offer>('/offers', body);
  }
  offerAction(id: string, action: string) {
    return this.api.post<Offer>('/offers/' + id + '/action', { action });
  }
  preferences() {
    return this.api.get<Preference[]>('/conversationPreferences');
  }
  preference(id: string, body: unknown) {
    return this.api.put<Preference>('/conversations/' + id + '/preferences', body);
  }
  labels() {
    return this.api.get<ConversationLabel[]>('/userConversationLabels');
  }
  saveLabel(body: unknown, id?: string) {
    return id
      ? this.api.patch<ConversationLabel>('/userConversationLabels/' + id, body)
      : this.api.post<ConversationLabel>('/userConversationLabels', body);
  }
  deleteLabel(id: string) {
    return this.api.delete('/userConversationLabels/' + id);
  }
}
export interface Quote {
  totalCents: number;
  days: number;
  paymentMode: string;
  snapshot: Order['snapshot'];
}
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private api = inject(Api);
  all() {
    return this.api.get<Order[]>('/orders', { _sort: 'createdAt', _order: 'desc' });
  }
  one(id: string) {
    return this.api.get<Order>('/orders/' + id);
  }
  action(id: string, action: string, note = '', confirmedAt = '') {
    return this.api.post<Order>('/orders/' + id + '/action', { action, note, confirmedAt });
  }
  quote(body: unknown) {
    return this.api.post<Quote>('/checkout/quote', body);
  }
  confirm(body: unknown) {
    return this.api.post<Order>('/checkout/confirm', body);
  }
  payments() {
    return this.api.get<Payment[]>('/payments', { _sort: 'createdAt', _order: 'desc' });
  }
  csv(params: Record<string, string>) {
    return '/api/billing/export?' + new HttpParams({ fromObject: params }).toString();
  }
}
@Injectable({ providedIn: 'root' })
export class ListsApi {
  private api = inject(Api);
  lists = signal<FavoriteList[]>([]);
  load() {
    return this.api.get<FavoriteList[]>('/favoriteLists').pipe(tap((l) => this.lists.set(l)));
  }
  save(body: unknown, id?: string) {
    return id
      ? this.api.patch<FavoriteList>('/favoriteLists/' + id, body)
      : this.api.post<FavoriteList>('/favoriteLists', body);
  }
  item(id: string, serviceId: string, remove = false) {
    return this.api
      .post<FavoriteList>('/favoriteLists/' + id + '/items', { serviceId, remove })
      .pipe(tap((l) => this.lists.update((ls) => ls.map((x) => (x.id === l.id ? l : x)))));
  }
  remove(id: string) {
    return this.api.delete('/favoriteLists/' + id);
  }
  share(id: string, revoke = false) {
    return this.api.post<FavoriteList>('/favoriteLists/' + id + '/share', { revoke });
  }
  shared(token: string) {
    return this.api.get<{
      name: string;
      description: string;
      services: Service[];
      unavailableCount: number;
    }>('/shared-lists/' + token);
  }
}
@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private api = inject(Api);
  all() {
    return this.api.get<Notification[]>('/notifications', {
      _sort: 'createdAt',
      _order: 'desc',
      _limit: 15,
    });
  }
  read(id: string) {
    return this.api.patch<Notification>('/notifications/' + id, { read: true });
  }
}
@Injectable({ providedIn: 'root' })
export class Ui {
  private auth = inject(Auth);
  private router = inject(Router);
  private origin = '';
  authOpen = signal(false);
  register = signal(false);
  intent = signal('customer');
  saveService = signal<Service | null>(null);
  toast = signal('');
  private continuation: (() => void) | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  access(action: () => void, register = false, intent = 'customer') {
    if (this.auth.user()) {
      action();
      return;
    }
    this.origin = this.router.url;
    this.continuation = action;
    this.register.set(register);
    this.intent.set(intent);
    this.authOpen.set(true);
  }
  authenticated(defer = false) {
    this.authOpen.set(false);
    if (defer) return;
    const c = this.continuation;
    this.continuation = null;
    c?.();
  }
  deferNavigation(url: string) {
    this.origin = url;
    this.continuation = null;
  }
  finishOnboarding(fallback = '/servicios') {
    const c = this.continuation;
    const origin = this.origin;
    this.continuation = null;
    this.origin = '';
    this.router.navigateByUrl(origin || fallback).then(() => c?.());
  }
  cancelAuth() {
    this.authOpen.set(false);
    this.continuation = null;
  }
  saved(s: Service) {
    this.access(() => this.saveService.set(s));
  }
  announce(text: string) {
    this.toast.set(text);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 4500);
  }
}
