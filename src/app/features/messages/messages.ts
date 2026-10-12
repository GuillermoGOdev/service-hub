import { Component, inject, signal, ViewChild, ElementRef, HostListener } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, switchMap, forkJoin, of, catchError, map } from 'rxjs';
import {
  MessagesApi,
  OrdersApi,
  CatalogApi,
  Api,
  Auth,
  Ui,
  Conversation,
  Message,
  Preference,
  ConversationLabel,
  Offer,
  Order,
  Service,
  Profile,
  errorMessage,
} from '../../core/api';
import {
  Avatar,
  Icon,
  Dialog,
  Feedback,
  PrecioSolesPipe,
  LimaDatePipe,
  StatusLabelPipe,
} from '../../shared/ui';
@Component({
  standalone: true,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    FormsModule,
    ReactiveFormsModule,
    Avatar,
    Icon,
    Dialog,
    Feedback,
    PrecioSolesPipe,
    LimaDatePipe,
    StatusLabelPipe,
  ],
  template: `
    <main
      class="messages-page"
      [class.has-conversation]="!!activeId()"
      [class.hide-summary]="!summary()"
    >
      <aside class="conversation-sidebar">
        <div class="conversation-heading">
          <h1>Conversaciones</h1>
          <button
            class="icon-button"
            aria-label="Buscar conversaciones"
            (click)="searchOpen.set(!searchOpen())"
          >
            <sh-icon name="akar-icons_search" />
          </button>
        </div>
        @if (searchOpen()) {
          <input
            class="form-control mb-3"
            [(ngModel)]="search"
            placeholder="Busca por nombre"
            aria-label="Buscar por nombre"
          />
        }
        <div class="conversation-filters">
          <select class="form-select" [(ngModel)]="folder" aria-label="Bandeja">
            <option value="inbox">Bandeja de entrada</option>
            <option value="archived">Archivadas</option>
            <option value="spam">Spam</option>
            <option value="deleted">Eliminadas para mí</option>
          </select>
          <div class="chips">
            <button class="chip" [class.selected]="onlyUnread" (click)="onlyUnread = !onlyUnread">
              No leídas</button
            ><button
              class="chip"
              [class.selected]="onlyStarred"
              (click)="onlyStarred = !onlyStarred"
            >
              Destacadas
            </button>
          </div>
          <select class="form-select" [(ngModel)]="labelFilter" aria-label="Filtrar por etiqueta">
            <option value="">Todas las etiquetas</option>
            @for (l of labels(); track l.id) {
              <option [value]="l.id">{{ l.name }}</option>
            }
          </select>
          @if (labelFilter) {
            <button class="chip" (click)="labelFilter = ''">{{ labelName(labelFilter) }} ×</button>
          }
        </div>
        <div class="conversation-list">
          @for (c of filteredConversations(); track c.id) {
            <a
              class="conversation-row"
              [class.active]="c.id === activeId()"
              [routerLink]="['/mensajes', c.id]"
              (click)="markRead(c.id)"
              ><sh-avatar [name]="name(other(c))" />
              <div>
                <strong>{{ name(other(c)) }}</strong
                ><small>{{ lastText(c) }}</small>
              </div>
              <span class="conversation-indicators">
                @if (pref(c.id)?.starred) {
                  <span aria-label="Destacada">★</span>
                }
                @if (pref(c.id)?.unread) {
                  <span class="unread-dot" aria-label="No leída"></span>
                }</span
            ></a>
          } @empty {
            <p class="muted p-3">No hay conversaciones en esta bandeja.</p>
          }
        </div>
      </aside>
      <section class="chat-panel">
        <sh-feedback [message]="error()" />
        @if (active(); as c) {
          <header class="chat-heading">
            <a class="mobile-back text-button" routerLink="/mensajes">←</a
            ><sh-avatar [name]="name(other(c))" />
            <div class="chat-person">
              <strong>{{ name(other(c)) }}</strong
              ><small>Último mensaje: {{ lastDate(c) | limaDate }}</small>
            </div>
            <button
              class="icon-button"
              [attr.aria-pressed]="!!pref(c.id)?.starred"
              aria-label="Destacar conversación"
              (click)="preference({ starred: !pref(c.id)?.starred })"
            >
              {{ pref(c.id)?.starred ? '★' : '☆' }}</button
            ><button class="text-button" (click)="labelsOpen.set(true)">Etiquetas</button
            ><button
              class="icon-button"
              aria-label="Opciones de conversación"
              (click)="options.set(true)"
            >
              ···
            </button>
          </header>
          <div class="chat-tabs">
            <button [class.selected]="!savedOnly()" (click)="savedOnly.set(false)">Todo</button
            ><button [class.selected]="savedOnly()" (click)="savedOnly.set(true)">Guardados</button
            ><button class="text-button ms-auto" (click)="summary.set(!summary())">
              {{ summary() ? 'Ocultar' : 'Ver' }} resumen
            </button>
          </div>
          <div class="message-feed" #feed (scroll)="trackScroll()">
            @for (m of shownMessages(); track m.id) {
              <article class="message-row" [class.system-message]="m.kind === 'event'">
                <sh-avatar [name]="m.authorId === auth.user()?.id ? 'Yo' : m.authorName" />
                <div class="message-body">
                  <div class="message-meta">
                    <strong>{{ m.authorId === auth.user()?.id ? 'Yo' : m.authorName }}</strong
                    ><time>{{ m.createdAt | limaDate }}</time>
                  </div>
                  @if (m.replyToId) {
                    <blockquote>{{ quoted(m.replyToId) }}</blockquote>
                  }
                  <p class="message-text">{{ m.text }}</p>
                  @for (file of m.fileIds; track file) {
                    <a [href]="'/api/files/' + file + '/content'" target="_blank" rel="noopener"
                      ><img
                        class="message-image"
                        [src]="'/api/files/' + file + '/content'"
                        alt="Imagen adjunta"
                    /></a>
                  }
                  @if (m.kind === 'offer' && offer(m.referenceId); as o) {
                    <section class="chat-offer">
                      <div class="section-heading">
                        <strong>{{ o.title }}</strong
                        ><span class="badge-soft">{{ o.status | statusLabel }}</span>
                      </div>
                      <p>{{ o.scope }}</p>
                      <strong>{{ o.totalCents | precioSoles }}</strong>
                      <p>{{ o.days }} días · {{ o.paymentMode | statusLabel }}</p>
                      <small>Vigente hasta {{ o.expiresAt | limaDate }}</small>
                      <div class="d-flex gap-2 mt-3">
                        @if (o.status === 'pending') {
                          @if (o.customerId === auth.user()?.id) {
                            <a
                              class="btn btn-primary"
                              routerLink="/checkout"
                              [queryParams]="{ offerId: o.id }"
                              >Revisar y contratar</a
                            ><button
                              class="btn btn-outline-danger"
                              (click)="offerAction(o.id, 'reject')"
                            >
                              Rechazar
                            </button>
                          } @else {
                            <button
                              class="btn btn-outline-danger"
                              (click)="offerAction(o.id, 'withdraw')"
                            >
                              Retirar oferta
                            </button>
                          }
                        }
                        @if (o.orderId) {
                          <a class="btn btn-outline-primary" [routerLink]="['/pedidos', o.orderId]"
                            >Ver pedido</a
                          >
                        }
                      </div>
                    </section>
                  }
                  @if (m.kind === 'event' && orderExists(m.referenceId)) {
                    <a [routerLink]="['/pedidos', m.referenceId]">Ver pedido</a>
                  }
                  <div class="message-actions">
                    <button class="text-button" (click)="reply.set(m)">Responder</button
                    ><button class="text-button" (click)="preference({ savedMessageId: m.id })">
                      {{
                        pref(c.id)?.savedMessageIds?.includes(m.id)
                          ? 'Quitar de guardados'
                          : 'Guardar'
                      }}
                    </button>
                  </div>
                </div>
              </article>
            } @empty {
              <div class="empty-state">
                {{
                  savedOnly()
                    ? 'Aún no guardaste mensajes.'
                    : 'Inicia la conversación con un mensaje.'
                }}
              </div>
            }
          </div>
          <div class="message-composer">
            @if (reply(); as m) {
              <div class="reply-preview">
                <span>Respondiendo a {{ m.authorName }}: {{ m.text.slice(0, 90) }}</span
                ><button
                  class="text-button"
                  aria-label="Cancelar respuesta"
                  (click)="reply.set(null)"
                >
                  ×
                </button>
              </div>
            }
            @if (fileIds().length) {
              <p class="small">
                {{ fileIds().length }} imagen(es) adjunta(s)
                <button class="text-button" (click)="fileIds.set([])">Quitar</button>
              </p>
            }
            <form [formGroup]="messageForm" (ngSubmit)="send()">
              <textarea
                class="form-control"
                formControlName="text"
                rows="3"
                placeholder="Escribe tu mensaje…"
                aria-label="Escribe tu mensaje"
              ></textarea>
              <div class="composer-actions">
                <label class="text-button attachment-button"
                  >Adjuntar imagen<input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    (change)="upload($event)"
                    [disabled]="busy()"
                /></label>
                @if (auth.user()?.providerEnabled) {
                  <button type="button" class="text-button" (click)="newOffer()">
                    Crear oferta
                  </button>
                }
                <button
                  class="btn btn-primary ms-auto"
                  [disabled]="
                    busy() || (!messageForm.controls.text.value.trim() && !fileIds().length)
                  "
                >
                  {{ busy() ? 'Enviando…' : 'Enviar' }}
                </button>
              </div>
            </form>
          </div>
        } @else {
          <div class="chat-empty">
            <img src="/assets/ilustrations/conversation-businessman-customer.svg" alt="" />
            <h2>Una buena conversación<br />es un buen comienzo.</h2>
            <p class="muted">Selecciona una conversación para ver los mensajes.</p>
            <a routerLink="/servicios" class="btn btn-outline-primary">Explorar servicios</a>
          </div>
        }
      </section>
      @if (active(); as c) {
        <ng-template #summaryContent>
          <div class="section-heading">
            <h2>Resumen</h2>
            <button class="text-button" (click)="summary.set(false)" aria-label="Ocultar resumen">
              ×
            </button>
          </div>
          <a [routerLink]="['/profesionales', other(c)]" class="provider-link"
            ><sh-avatar [name]="name(other(c))" /><strong>{{ name(other(c)) }}</strong></a
          >
          @if (profile(other(c)); as p) {
            <p class="mt-4">{{ p.headline }}</p>
            <p>{{ p.region }}</p>
            @for (l of p.languages; track l.name) {
              <small>{{ l.name }} · {{ l.level }}</small>
            }
          }
          <h3 class="mt-5">Pedidos compartidos</h3>
          @for (o of sharedOrders(); track o.id) {
            <a class="shared-order" [routerLink]="['/pedidos', o.id]"
              ><strong>{{ o.snapshot.title }}</strong
              ><span>{{ o.status | statusLabel }}</span></a
            >
          } @empty {
            <p class="muted">Aún no hay pedidos en esta conversación.</p>
          }
        </ng-template>
        @if (mobile()) {
          @if (summary()) {
            <sh-dialog
              title="Resumen de la conversación"
              [drawer]="true"
              (closed)="summary.set(false)"
            >
              <ng-container *ngTemplateOutlet="summaryContent" />
            </sh-dialog>
          }
        } @else {
          <aside class="chat-summary" [class.summary-open]="summary()">
            <ng-container *ngTemplateOutlet="summaryContent" />
          </aside>
        }
      }
    </main>
    @if (options()) {
      <sh-dialog title="Organizar conversación" (closed)="options.set(false)"
        ><div class="account-menu">
          <button
            class="text-button"
            (click)="preference({ unread: !pref(activeId())?.unread }); options.set(false)"
          >
            {{ pref(activeId())?.unread ? 'Marcar leída' : 'Marcar no leída' }}</button
          ><button class="text-button" (click)="move('inbox')">Mover a bandeja de entrada</button
          ><button class="text-button" (click)="move('archived')">Archivar</button
          ><button class="text-button" (click)="move('spam')">Enviar a spam</button
          ><button
            class="text-button danger"
            (click)="deleteConversation.set(true); options.set(false)"
          >
            Eliminar de mi bandeja
          </button>
        </div></sh-dialog
      >
    }
    @if (deleteConversation()) {
      <sh-dialog title="¿Eliminar de tu bandeja?" (closed)="deleteConversation.set(false)"
        ><p>
          La otra persona conservará la conversación. Los pedidos y sus mensajes seguirán
          registrados.
        </p>
        <button class="btn btn-danger" (click)="move('deleted'); deleteConversation.set(false)">
          Eliminar para mí
        </button></sh-dialog
      >
    }
    @if (labelsOpen()) {
      <sh-dialog title="Etiquetas de la conversación" (closed)="labelsOpen.set(false)">
        @for (l of labels(); track l.id) {
          <div class="label-row">
            <label
              ><input
                class="form-check-input"
                type="checkbox"
                [checked]="pref(activeId())?.labelIds?.includes(l.id)"
                (change)="toggleLabel(l.id)"
              />{{ l.name }}</label
            ><button class="text-button" (click)="editLabel(l)">Editar</button
            ><button class="text-button danger" (click)="deleteLabel.set(l)">Borrar</button>
          </div>
        }
        <button class="btn btn-outline-primary mt-3" (click)="editLabel()">
          Nueva etiqueta
        </button></sh-dialog
      >
    }
    @if (labelEditor()) {
      <sh-dialog title="Editar etiqueta" (closed)="labelEditor.set(false)"
        ><form [formGroup]="labelForm" (ngSubmit)="saveLabel()" class="form-stack">
          <label>Nombre<input class="form-control" formControlName="name" /></label
          ><label
            >Descripción<textarea
              class="form-control"
              formControlName="description"
            ></textarea></label
          ><sh-feedback [message]="dialogError()" /><button
            class="btn btn-primary"
            [disabled]="labelForm.invalid"
          >
            Guardar etiqueta
          </button>
        </form></sh-dialog
      >
    }
    @if (deleteLabel(); as l) {
      <sh-dialog title="¿Borrar etiqueta?" (closed)="deleteLabel.set(null)"
        ><p>Se quitará “{{ l.name }}” de tus conversaciones. Los mensajes se conservan.</p>
        <button class="btn btn-danger" (click)="removeLabel(l.id)">
          Borrar etiqueta
        </button></sh-dialog
      >
    }
    @if (offerOpen()) {
      <sh-dialog
        title="Crear una oferta personalizada"
        [drawer]="true"
        (closed)="offerOpen.set(false)"
        ><form [formGroup]="offerForm" (ngSubmit)="sendOffer()" class="form-stack">
          <label
            >Servicio<select class="form-select" formControlName="serviceId">
              <option value="">Selecciona uno de tus servicios</option>
              @for (s of myServices(); track s.id) {
                <option [value]="s.id">{{ s.title }}</option>
              }
            </select></label
          ><label>Título<input class="form-control" formControlName="title" /></label
          ><label
            >Alcance acordado<textarea
              rows="4"
              class="form-control"
              formControlName="scope"
            ></textarea></label
          ><label
            >Importe total (S/)<input
              class="form-control"
              type="number"
              step="0.01"
              min="1"
              formControlName="price" /></label
          ><label
            >Plazo en días<input
              class="form-control"
              type="number"
              min="1"
              max="365"
              formControlName="days" /></label
          ><label
            >Pago<select class="form-select" formControlName="paymentMode">
              <option value="platform">En plataforma</option>
              <option value="onsite">Presencial (solo servicios presenciales)</option>
            </select></label
          ><label
            >Vigencia (fecha y hora Lima)<input
              class="form-control"
              type="datetime-local"
              formControlName="expiresAt" /></label
          ><sh-feedback [message]="dialogError()" /><button
            class="btn btn-primary"
            [disabled]="offerForm.invalid || busy()"
          >
            Enviar oferta
          </button>
        </form></sh-dialog
      >
    }
  `,
})
export class Messages {
  api = inject(MessagesApi);
  ordersApi = inject(OrdersApi);
  catalog = inject(CatalogApi);
  files = inject(Api);
  auth = inject(Auth);
  ui = inject(Ui);
  router = inject(Router);
  route = inject(ActivatedRoute);
  fb = inject(FormBuilder);
  conversations = signal<Conversation[]>([]);
  messages = signal<Message[]>([]);
  preferences = signal<Preference[]>([]);
  labels = signal<ConversationLabel[]>([]);
  offers = signal<Offer[]>([]);
  orders = signal<Order[]>([]);
  profiles = signal<Profile[]>([]);
  people = signal<Record<string, string>>({});
  myServices = signal<Service[]>([]);
  activeId = signal('');
  summary = signal(window.innerWidth > 900);
  mobile = signal(window.innerWidth <= 900);
  @HostListener('window:resize') onResize() {
    const mobile = window.innerWidth <= 900;
    if (mobile !== this.mobile()) this.summary.set(!mobile);
    this.mobile.set(mobile);
  }
  savedOnly = signal(false);
  error = signal('');
  dialogError = signal('');
  busy = signal(false);
  searchOpen = signal(false);
  options = signal(false);
  labelsOpen = signal(false);
  labelEditor = signal(false);
  deleteConversation = signal(false);
  deleteLabel = signal<ConversationLabel | null>(null);
  offerOpen = signal(false);
  reply = signal<Message | null>(null);
  fileIds = signal<string[]>([]);
  search = '';
  folder = 'inbox';
  onlyUnread = false;
  onlyStarred = false;
  labelFilter = '';
  editingLabelId?: string;
  nearBottom = true;
  @ViewChild('feed') feed?: ElementRef<HTMLElement>;
  messageForm = this.fb.nonNullable.group({ text: [''] });
  labelForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });
  offerForm = this.fb.nonNullable.group({
    serviceId: ['', Validators.required],
    title: ['', [Validators.required, Validators.minLength(5)]],
    scope: ['', [Validators.required, Validators.minLength(10)]],
    price: [100, [Validators.required, Validators.min(1)]],
    days: [3, [Validators.required, Validators.min(1)]],
    paymentMode: ['platform'],
    expiresAt: ['', Validators.required],
  });
  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((p) => {
          this.activeId.set(p.get('id') || '');
          this.reply.set(null);
          this.fileIds.set([]);
          this.messageForm.reset();
          this.nearBottom = true;
          return timer(0, 4000).pipe(switchMap(() => this.fetch()));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        if (!data) return;
        const oldLast = this.messages().at(-1)?.id;
        this.conversations.set(data.conversations);
        this.preferences.set(data.preferences);
        this.labels.set(data.labels);
        this.messages.set(data.messages);
        this.offers.set(data.offers);
        this.orders.set(data.orders);
        this.loadNames(data.conversations);
        if (oldLast !== data.messages.at(-1)?.id && this.nearBottom)
          setTimeout(() => this.scrollBottom(), 50);
      });
    this.catalog.profiles().subscribe({
      next: (p) => this.profiles.set(p),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  fetch() {
    return forkJoin({
      conversations: this.api.conversations(),
      preferences: this.api.preferences(),
      labels: this.api.labels(),
      messages: this.activeId() ? this.api.messages(this.activeId()) : of([] as Message[]),
      offers: this.activeId() ? this.api.offers(this.activeId()) : of([] as Offer[]),
      orders: this.ordersApi.all(),
    }).pipe(
      catchError((e) => {
        this.error.set(errorMessage(e));
        return of(null);
      }),
    );
  }
  refresh() {
    this.fetch().subscribe((d) => {
      if (d) {
        this.conversations.set(d.conversations);
        this.preferences.set(d.preferences);
        this.labels.set(d.labels);
        this.messages.set(d.messages);
        this.offers.set(d.offers);
        this.orders.set(d.orders);
      }
    });
  }
  loadNames(cs: Conversation[]) {
    const ids = [...new Set(cs.flatMap((c) => c.participantIds))].filter(
      (id) => !this.people()[id],
    );
    if (!ids.length) return;
    forkJoin(ids.map((id) => this.catalog.person(id))).subscribe({
      next: (ps) =>
        this.people.update((old) => ({
          ...old,
          ...Object.fromEntries(ps.map((p) => [p.id, p.name])),
        })),
      error: () => {},
    });
  }
  active() {
    return this.conversations().find((c) => c.id === this.activeId());
  }
  other(c: Conversation) {
    return c.participantIds.find((id) => id !== this.auth.user()?.id) || '';
  }
  name(id: string) {
    return this.people()[id] || this.profiles().find((p) => p.userId === id)?.name || 'Persona';
  }
  profile(id: string) {
    return this.profiles().find((p) => p.userId === id);
  }
  pref(id: string) {
    return this.preferences().find((p) => p.conversationId === id);
  }
  labelName(id: string) {
    return this.labels().find((l) => l.id === id)?.name || '';
  }
  filteredConversations() {
    return this.conversations().filter((c) => {
      const p = this.pref(c.id);
      return (
        (p?.folder || 'inbox') === this.folder &&
        (!this.onlyUnread || p?.unread) &&
        (!this.onlyStarred || p?.starred) &&
        (!this.labelFilter || p?.labelIds.includes(this.labelFilter)) &&
        this.name(this.other(c)).toLowerCase().includes(this.search.toLowerCase())
      );
    });
  }
  lastText(c: Conversation) {
    return c.id === this.activeId()
      ? this.messages().at(-1)?.text || 'Sin mensajes'
      : c.lastMessage || 'Sin mensajes';
  }
  lastDate(c: Conversation) {
    return c.updatedAt;
  }
  shownMessages() {
    return this.savedOnly()
      ? this.messages().filter((m) => this.pref(this.activeId())?.savedMessageIds.includes(m.id))
      : this.messages();
  }
  offer(id?: string) {
    return this.offers().find((o) => o.id === id);
  }
  orderExists(id?: string) {
    return this.orders().some((o) => o.id === id);
  }
  sharedOrders() {
    return this.orders().filter((o) => o.conversationId === this.activeId());
  }
  quoted(id: string) {
    return this.messages().find((m) => m.id === id)?.text || 'Mensaje citado';
  }
  preference(body: unknown) {
    this.api.preference(this.activeId(), body).subscribe({
      next: (p) => this.preferences.update((ps) => [...ps.filter((x) => x.id !== p.id), p]),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  markRead(id: string) {
    this.api.preference(id, { unread: false }).subscribe({
      next: (p) => this.preferences.update((ps) => [...ps.filter((x) => x.id !== p.id), p]),
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  move(folder: string) {
    this.preference({ folder });
    this.options.set(false);
  }
  send() {
    const text = this.messageForm.controls.text.value.trim();
    if (!text && !this.fileIds().length) return;
    this.busy.set(true);
    this.api
      .send({
        conversationId: this.activeId(),
        text,
        fileIds: this.fileIds(),
        replyToId: this.reply()?.id,
      })
      .subscribe({
        next: (m) => {
          this.messages.update((ms) => [...ms.filter((x) => x.id !== m.id), m]);
          this.messageForm.reset();
          this.fileIds.set([]);
          this.reply.set(null);
          this.busy.set(false);
          this.nearBottom = true;
          setTimeout(() => this.scrollBottom(), 30);
        },
        error: (e) => {
          this.error.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
  upload(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (this.fileIds().length >= 6) {
      this.error.set('Máximo seis imágenes por mensaje.');
      return;
    }
    this.busy.set(true);
    this.files.upload(file, this.activeId()).subscribe({
      next: (f) => {
        this.fileIds.update((fs) => [...fs, f.id]);
        this.busy.set(false);
      },
      error: (e) => {
        this.error.set(errorMessage(e));
        this.busy.set(false);
      },
    });
  }
  toggleLabel(id: string) {
    const ids = this.pref(this.activeId())?.labelIds || [];
    this.preference({ labelIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  }
  editLabel(l?: ConversationLabel) {
    this.editingLabelId = l?.id;
    this.labelForm.reset({ name: l?.name || '', description: l?.description || '' });
    this.labelEditor.set(true);
    this.dialogError.set('');
  }
  saveLabel() {
    if (this.labelForm.invalid) return;
    this.api.saveLabel(this.labelForm.getRawValue(), this.editingLabelId).subscribe({
      next: () => {
        this.labelEditor.set(false);
        this.refresh();
      },
      error: (e) => this.dialogError.set(errorMessage(e)),
    });
  }
  removeLabel(id: string) {
    this.api.deleteLabel(id).subscribe({
      next: () => {
        this.deleteLabel.set(null);
        this.refresh();
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  newOffer() {
    this.catalog.services({ providerId: this.auth.user()!.id, status: 'published' }).subscribe({
      next: (ss) => {
        this.myServices.set(ss);
        this.offerOpen.set(true);
        this.dialogError.set('');
      },
      error: (e) => this.error.set(errorMessage(e)),
    });
  }
  sendOffer() {
    if (this.offerForm.invalid) return;
    const v = this.offerForm.getRawValue();
    this.busy.set(true);
    this.api
      .createOffer({
        ...v,
        totalCents: Math.round(v.price * 100),
        expiresAt: v.expiresAt + ':00-05:00',
        conversationId: this.activeId(),
      })
      .subscribe({
        next: () => {
          this.offerOpen.set(false);
          this.busy.set(false);
          this.refresh();
        },
        error: (e) => {
          this.dialogError.set(errorMessage(e));
          this.busy.set(false);
        },
      });
  }
  offerAction(id: string, action: string) {
    this.api
      .offerAction(id, action)
      .subscribe({ next: () => this.refresh(), error: (e) => this.error.set(errorMessage(e)) });
  }
  trackScroll() {
    const el = this.feed?.nativeElement;
    if (el) this.nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }
  scrollBottom() {
    const el = this.feed?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}
