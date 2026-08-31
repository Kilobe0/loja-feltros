'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Truck, RefreshCw, Printer } from 'lucide-react';
import {
  getOrders, deleteOrder, buyShipmentLabel, refreshShipmentLabel,
  Order, formatPrice, getImageUrl,
} from '@/lib/api';
import { toast } from '@/components/admin/Toast';
import AdminShell from '@/components/admin/AdminShell';
import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', CANCELLED: 'Cancelado' };
const PAYMENT_LABELS: Record<string, string> = {
  account_money: 'Saldo MP',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  bank_transfer: 'Pix',
  ticket: 'Boleto',
};

// Ciclo de vida da etiqueta no Melhor Envio (webhook mantém atualizado).
const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Etiqueta pendente',
  paid: 'Etiqueta paga',
  generated: 'Etiqueta gerada',
  released: 'Etiqueta liberada',
  posted: 'Postado',
  delivered: 'Entregue',
  canceled: 'Etiqueta cancelada',
  undelivered: 'Não entregue',
  expired: 'Etiqueta expirada',
};

type Filter = 'ALL' | 'PAID' | 'PENDING' | 'CANCELLED';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fullAddress(a: Order['customer']['address']): string {
  const line1 = [a.street, a.number].filter(Boolean).join(', ');
  const parts = [line1, a.complement, a.neighborhood, [a.city, a.state].filter(Boolean).join(' / '), a.zipCode];
  return parts.filter(Boolean).join(' · ');
}

export default function AdminPedidosPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('lf_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    getOrders(t).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);

  async function handleDelete(order: Order) {
    if (!confirm(`Excluir o pedido de ${order.customer.name} (${formatPrice(order.totalAmount)})? Esta ação não pode ser desfeita.`)) return;
    setDeleting(order._id);
    try {
      await deleteOrder(order._id, token);
      setOrders(prev => prev.filter(o => o._id !== order._id));
      toast('Pedido excluído');
    } catch (e: any) {
      toast(e.message || 'Erro ao excluir o pedido', 'error');
    } finally {
      setDeleting(null);
    }
  }

  async function handleBuyLabel(order: Order) {
    const freight = order.shipping ? ` (frete cotado: ${formatPrice(order.shipping.price)})` : '';
    if (!confirm(
      `Comprar a etiqueta deste envio no Melhor Envio?${freight}\n\n` +
      'O valor será debitado do saldo da carteira Melhor Envio. Cancelar antes da postagem devolve o saldo.',
    )) return;
    setBuying(order._id);
    try {
      const updated = await buyShipmentLabel(order._id, token);
      setOrders(prev => prev.map(o => (o._id === order._id ? updated : o)));
      toast('Etiqueta comprada');
    } catch (e: any) {
      toast(e.message || 'Erro ao comprar a etiqueta', 'error');
    } finally {
      setBuying(null);
    }
  }

  async function handleRefreshShipment(order: Order) {
    setRefreshing(order._id);
    try {
      const updated = await refreshShipmentLabel(order._id, token);
      setOrders(prev => prev.map(o => (o._id === order._id ? updated : o)));
      toast('Rastreio atualizado');
    } catch (e: any) {
      toast(e.message || 'Erro ao atualizar o rastreio', 'error');
    } finally {
      setRefreshing(null);
    }
  }

  const visible = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  return (
    <AdminShell>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Pedidos</h1>
        <div className={styles.filters} role="tablist" aria-label="Filtrar pedidos">
          {(['ALL', 'PAID', 'PENDING', 'CANCELLED'] as Filter[]).map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'Todos' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : visible.length === 0 ? (
        <p className={styles.empty}>Nenhum pedido {filter !== 'ALL' ? `com status "${STATUS_LABELS[filter]}"` : 'ainda'}.</p>
      ) : (
        <div className={styles.list}>
          {visible.map(order => (
            <article key={order._id} className={styles.orderCard}>
              <div className={styles.orderTop}>
                <div className={styles.orderMeta}>
                  <span className={`badge ${order.status === 'PAID' ? 'badge-available' : 'badge-sold'}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
                  <span className={styles.orderId}>#{order._id.slice(-8).toUpperCase()}</span>
                </div>
                <div className={styles.orderTotalWrap}>
                  <span className={styles.orderTotal}>{formatPrice(order.totalAmount)}</span>
                  <span className={styles.orderPayment}>
                    {order.paymentMethod ? (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod) : '—'}
                  </span>
                </div>
              </div>

              <div className={styles.orderBody}>
                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Cliente & entrega</h3>
                  <p className={styles.customerName}>{order.customer.name}</p>
                  <dl className={styles.dl}>
                    <div><dt>E-mail</dt><dd><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></dd></div>
                    {order.customer.phone && <div><dt>Telefone</dt><dd>{order.customer.phone}</dd></div>}
                    {order.customer.cpf && <div><dt>CPF</dt><dd>{order.customer.cpf}</dd></div>}
                    <div><dt>Endereço</dt><dd>{fullAddress(order.customer.address) || '—'}</dd></div>
                    <div><dt>Frete</dt><dd>{order.shipping ? `${order.shipping.service} (${order.shipping.company}) · ${formatPrice(order.shipping.price)}` : '—'}</dd></div>
                  </dl>
                </div>

                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>Itens ({order.items.length})</h3>
                  <div className={styles.items}>
                    {order.items.map((item, i) => (
                      <div key={i} className={styles.item}>
                        <div className={styles.itemImg}>
                          <Image src={getImageUrl(item.image)} alt={item.title} fill style={{ objectFit: 'cover' }} sizes="48px" />
                        </div>
                        <span className={styles.itemTitle}>{item.title} × {item.quantity}</span>
                        <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.orderActions}>
                <div className={styles.shipmentArea}>
                  {order.status === 'PAID' && order.shipping && !order.shipment?.meOrderId && (
                    <button className={styles.shipBtn} onClick={() => handleBuyLabel(order)} disabled={buying === order._id}>
                      <Truck size={14} strokeWidth={1.75} />
                      {buying === order._id ? 'Comprando...' : 'Comprar etiqueta'}
                    </button>
                  )}
                  {order.shipment?.meOrderId && (
                    <>
                      <span className={styles.shipmentStatus}>
                        <Truck size={14} strokeWidth={1.75} />
                        {SHIPMENT_STATUS_LABELS[order.shipment.status || ''] ?? order.shipment.status}
                      </span>
                      {order.shipment.trackingCode && (
                        order.shipment.trackingUrl ? (
                          <a className={styles.trackingCode} href={order.shipment.trackingUrl} target="_blank" rel="noreferrer">{order.shipment.trackingCode}</a>
                        ) : (
                          <span className={styles.trackingCode}>{order.shipment.trackingCode}</span>
                        )
                      )}
                      {order.shipment.labelUrl && (
                        <a className={styles.shipBtn} href={order.shipment.labelUrl} target="_blank" rel="noreferrer">
                          <Printer size={14} strokeWidth={1.75} /> Imprimir etiqueta
                        </a>
                      )}
                      <button className={styles.ghostBtn} onClick={() => handleRefreshShipment(order)} disabled={refreshing === order._id} title="Reconsulta etiqueta e rastreio no Melhor Envio">
                        <RefreshCw size={14} strokeWidth={1.75} />
                        {refreshing === order._id ? 'Atualizando...' : 'Atualizar rastreio'}
                      </button>
                    </>
                  )}
                </div>
                <button className={styles.deleteBtn} onClick={() => handleDelete(order)} disabled={deleting === order._id}>
                  {deleting === order._id ? 'Excluindo...' : 'Excluir pedido'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
