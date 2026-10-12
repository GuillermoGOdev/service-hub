export type Id = string;
export type Modality = 'digital' | 'presencial';
export type WorkStatus = 'agreed' | 'in_progress' | 'delivered' | 'completed' | 'cancelled';
export interface User {
  id: Id;
  name: string;
  email: string;
  providerEnabled: boolean;
  createdAt: string;
}
export interface Language {
  name: string;
  level: 'básico' | 'intermedio' | 'avanzado';
}
export interface Profile {
  id: Id;
  userId: Id;
  name: string;
  headline: string;
  region: string;
  zones: string;
  about: string;
  skills: string[];
  languages: Language[];
  avatarId?: Id;
  experience: string;
  education: string;
  certifications: string;
  availability: string;
  completed: boolean;
}
export interface Category {
  id: Id;
  name: string;
  illustration: string;
  color: string;
  light: string;
}
export interface ServiceType {
  id: Id;
  categoryId: Id;
  name: string;
}
export interface Package {
  id: Id;
  name: string;
  scope: string;
  priceCents: number;
  unit: 'proyecto' | 'hora' | 'visita';
  days: number;
  revisions: number;
  bookingMode: 'direct' | 'request';
  features: string[];
}
export interface Extra {
  id: Id;
  name: string;
  priceCents: number;
  days: number;
}
export interface Service {
  id: Id;
  providerId: Id;
  title: string;
  categoryId: Id;
  typeId: Id;
  tags: string[];
  modality: Modality;
  region: string;
  zones: string;
  description: string;
  cover: string;
  imageIds: Id[];
  packages: Package[];
  extras: Extra[];
  requirements: string;
  faq: { question: string; answer: string }[];
  status: 'draft' | 'published' | 'paused';
  createdAt: string;
}
export interface Review {
  id: Id;
  orderId: Id;
  serviceId: Id;
  providerId: Id;
  customerId: Id;
  authorName: string;
  rating: number;
  comment: string;
  cancelled: boolean;
  response?: string;
  createdAt: string;
}
export interface Conversation {
  lastMessage?: string;
  id: Id;
  participantIds: Id[];
  customerId: Id;
  providerId: Id;
  createdAt: string;
  updatedAt: string;
}
export interface Message {
  id: Id;
  conversationId: Id;
  contextCustomerId?: Id;
  contextProviderId?: Id;
  authorId: Id;
  authorName: string;
  text: string;
  kind: 'text' | 'request' | 'offer' | 'event';
  referenceId?: Id;
  replyToId?: Id;
  fileIds: Id[];
  createdAt: string;
}
export interface Preference {
  id: Id;
  userId: Id;
  conversationId: Id;
  folder: 'inbox' | 'archived' | 'spam' | 'deleted';
  starred: boolean;
  unread: boolean;
  readAt: string;
  labelIds: Id[];
  savedMessageIds: Id[];
}
export interface ConversationLabel {
  id: Id;
  userId: Id;
  name: string;
  description: string;
}
export interface Offer {
  id: Id;
  conversationId: Id;
  serviceId: Id;
  providerId: Id;
  customerId: Id;
  title: string;
  scope: string;
  totalCents: number;
  days: number;
  paymentMode: 'platform' | 'onsite';
  expiresAt: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  orderId?: Id;
  createdAt: string;
}
export interface Order {
  id: Id;
  customerId: Id;
  providerId: Id;
  offerId?: Id;
  conversationId: Id;
  serviceId: Id;
  snapshot: {
    title: string;
    providerName: string;
    customerName?: string;
    packageName: string;
    scope: string;
    unitPriceCents: number;
    quantity: number;
    extras: Extra[];
    modality: Modality;
  };
  totalCents: number;
  requirements: string;
  status: WorkStatus;
  paymentStatus: string;
  paymentMode: 'platform' | 'onsite';
  requestedAt?: string;
  confirmedAt?: string;
  address?: string;
  dueAt: string;
  startedAt?: string;
  createdAt: string;
  events: { action: string; actorId: Id; at: string; note: string }[];
  idempotencyKey: string;
}
export interface Payment {
  id: Id;
  orderId: Id;
  customerId: Id;
  providerId: Id;
  title: string;
  amountCents: number;
  status: string;
  createdAt: string;
}
export interface FavoriteList {
  id: Id;
  userId: Id;
  name: string;
  description: string;
  serviceIds: Id[];
  shareToken?: string;
  createdAt: string;
}
export interface Notification {
  id: Id;
  userId: Id;
  title: string;
  url: string;
  read: boolean;
  createdAt: string;
}
export interface FileRecord {
  id: Id;
  ownerId: Id;
  mime: string;
  size: number;
  visibility: 'public' | 'private';
  conversationId?: Id;
  createdAt: string;
  url: string;
}
export interface Metrics {
  rating: number;
  reviewCount: number;
  completed: number;
  level: string;
  savedCount: number;
  responseMinutes: number | null;
}
