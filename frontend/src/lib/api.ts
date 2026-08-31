// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Token expirado/inválido: limpa a sessão e manda pro login. Só dispara quando
// a própria chamada carregava Authorization — um 401 de /auth/login (senha
// errada) não passa por aqui, então não atrapalha a mensagem de erro do form.
function handleSessionExpired() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('lf_token');
  localStorage.removeItem('lf_admin');
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login?expired=1';
  }
}

function hasAuthHeader(options?: RequestInit): boolean {
  const h = options?.headers;
  if (!h) return false;
  if (h instanceof Headers) return h.has('Authorization');
  if (Array.isArray(h)) return h.some(([k]) => k.toLowerCase() === 'authorization');
  return Object.keys(h).some(k => k.toLowerCase() === 'authorization');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // headers por último: o spread de options não pode substituir o objeto
  // headers inteiro, senão derruba o Content-Type.
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (res.status === 401 && hasAuthHeader(options)) {
    handleSessionExpired();
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  // DELETEs respondem sem corpo — res.json() em corpo vazio lançaria erro.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ─── Types ───────────────────────────────────────────────
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ProductVariant {
  name: string;
  image: string;
  quantity: number;
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  description: string;
  // Ficha técnica genérica (ex.: "Feltro 100% poliéster, enchimento fiberfill")
  attributes?: string;
  dimensions: string;
  // Peso em kg (numérico para cálculo de frete)
  weight?: number;
  price: number;
  // Unidades em estoque (ignorado quando há variantes — nesse caso o estoque
  // é a soma das variantes)
  quantity: number;
  status: 'AVAILABLE' | 'OUT_OF_STOCK';
  featured: boolean;
  images: string[];
  variants?: ProductVariant[];
  category: Category;
  createdAt: string;
}

export interface ShippingOption {
  company: string;
  service: string;
  price: number;
  deliveryDays: number;
}

// Etiqueta comprada no Melhor Envio (pedido pago com frete). O status segue o
// ciclo de vida de lá: paid → generated → posted → delivered (ou canceled).
export interface OrderShipment {
  meOrderId: string;
  protocol?: string;
  status?: string;
  trackingCode?: string;
  trackingUrl?: string;
  labelUrl?: string;
  price?: number;
  purchasedAt?: string;
  postedAt?: string;
  deliveredAt?: string;
}

export interface Order {
  _id: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  // Frete escolhido no checkout (ausente = entrega local ou reserva)
  shipping?: ShippingOption;
  // Etiqueta do Melhor Envio (só depois que o admin compra)
  shipment?: OrderShipment;
  // Capturado do Mercado Pago no webhook (account_money, credit_card,
  // bank_transfer, ticket...). Vazio enquanto PENDING.
  paymentMethod?: string;
  totalAmount: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  items: Array<{ product: string; title: string; price: number; quantity: number; image: string; variant?: string }>;
  createdAt: string;
}

// ─── Products ────────────────────────────────────────────
export const getProducts = (params?: { category?: string; status?: string }) => {
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return apiFetch<Product[]>(`/products${query ? `?${query}` : ''}`);
};

export const getFeaturedProducts = () => apiFetch<Product[]>('/products/featured');

export const getProductBySlug = (slug: string) => apiFetch<Product>(`/products/${slug}`);

export const getRelatedProducts = (id: string, categoryId: string) =>
  apiFetch<Product[]>(`/products/${id}/related?categoryId=${categoryId}`);

export const createProduct = (data: Partial<Product>, token: string) =>
  apiFetch<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateProduct = (id: string, data: Partial<Product>, token: string) =>
  apiFetch<Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteProduct = (id: string, token: string) =>
  apiFetch<void>(`/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── Categories ──────────────────────────────────────────
export const getCategories = () => apiFetch<Category[]>('/categories');

// ─── Orders ──────────────────────────────────────────────
export const createOrder = (data: {
  customer: Order['customer'];
  items: Array<{ productId: string; variant?: string; quantity: number }>;
  // O preço do frete é recotado no servidor; aqui vai só a opção escolhida.
  shipping?: { company: string; service: string };
}) =>
  apiFetch<{ order: Order; initPoint: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ─── Frete ───────────────────────────────────────────────
export const quoteShipping = (zipTo: string, items: Array<{ productId: string; quantity: number }>) =>
  apiFetch<ShippingOption[]>('/shipping/quote', {
    method: 'POST',
    body: JSON.stringify({ zipTo, items }),
  });

// Público: usado pela página de retorno do checkout para acompanhar o Pix.
export const getOrderStatus = (id: string) =>
  apiFetch<{ status: 'PENDING' | 'PAID' | 'CANCELLED' }>(`/orders/${id}/status`);

// ─── Sessão de checkout ──────────────────────────────────
// Guarda o pagamento em andamento para o cliente poder voltar ao Mercado
// Pago se fechar a aba (o produto fica reservado ~30 min; o link expira junto).
export interface CheckoutSession {
  orderId: string;
  initPoint: string;
  expiresAt: number; // epoch ms
}

const CHECKOUT_SESSION_KEY = 'lf_checkout_session';
export const CHECKOUT_SESSION_TTL_MS = 30 * 60 * 1000;

export function saveCheckoutSession(s: CheckoutSession) {
  try { localStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(s)); } catch {}
}

export function loadCheckoutSession(): CheckoutSession | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as CheckoutSession;
    if (!s.orderId || !s.initPoint || Date.now() > s.expiresAt) {
      clearCheckoutSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearCheckoutSession() {
  try { localStorage.removeItem(CHECKOUT_SESSION_KEY); } catch {}
}

export const getOrders = (token: string) =>
  apiFetch<Order[]>('/orders', { headers: { Authorization: `Bearer ${token}` } });

export const getOrderStats = (token: string) =>
  apiFetch<{ total: number; sold: number; revenue: number; pendingOrders: number }>(
    '/orders/stats',
    { headers: { Authorization: `Bearer ${token}` } },
  );

// Compra a etiqueta do Melhor Envio (debita a carteira de verdade!).
export const buyShipmentLabel = (id: string, token: string) =>
  apiFetch<Order>(`/orders/${id}/shipment`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

// Reconsulta etiqueta/rastreio de um envio já comprado.
export const refreshShipmentLabel = (id: string, token: string) =>
  apiFetch<Order>(`/orders/${id}/shipment/refresh`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

export const deleteOrder = (id: string, token: string) =>
  apiFetch<void>(`/orders/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

// ─── Auth ────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string; admin: { name: string; email: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// ─── Upload ──────────────────────────────────────────────
export const uploadImage = async (file: File, token: string): Promise<{ url: string }> => {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (res.status === 401) handleSessionExpired();
  if (!res.ok) throw new Error('Falha no upload');
  return res.json();
};

// ─── Helpers ─────────────────────────────────────────────
export const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

export const priceLabel = (product: Pick<Product, 'price'>): string => formatPrice(product.price);

// Estoque disponível de um produto: soma das variantes, se houver, senão a
// quantidade do próprio produto.
export const availableStock = (product: Pick<Product, 'quantity' | 'variants'>): number =>
  product.variants && product.variants.length > 0
    ? product.variants.reduce((sum, v) => sum + v.quantity, 0)
    : product.quantity;

// Classe de badge + texto por status, usado no card, no detalhe e no admin.
export const statusBadge = (status: Product['status']): { cls: string; label: string } =>
  status === 'AVAILABLE'
    ? { cls: 'badge-available', label: 'Disponível' }
    : { cls: 'badge-sold', label: 'Esgotado' };

export const getImageUrl = (path: string) => {
  if (!path) return '/placeholder.jpg';
  if (path.startsWith('http')) {
    // Cloudinary: entrega otimizada — f_auto escolhe o melhor formato p/ o
    // navegador (AVIF/WebP) e q_auto ajusta a compressão sem perda visível.
    if (path.includes('res.cloudinary.com') && path.includes('/upload/') && !path.includes('/upload/f_auto')) {
      return path.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return path;
  }
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${path}`;
};
