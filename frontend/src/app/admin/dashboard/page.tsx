'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts, getOrderStats, getOrders, Product, Order, formatPrice } from '@/lib/api';
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, sold: 0, revenue: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('lf_token');
    if (!t) { router.push('/admin/login'); return; }

    Promise.all([
      getProducts().catch(() => []),
      getOrderStats(t).catch(() => ({ total: 0, sold: 0, revenue: 0, pendingOrders: 0 })),
      getOrders(t).catch(() => []),
    ]).then(([productList, orderStats, orderList]) => {
      setProducts(productList as Product[]);
      setStats(orderStats as any);
      setOrders((orderList as Order[]).slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className={styles.loading}><span>Carregando...</span></div>;
  }

  const available = products.filter(p => p.status === 'AVAILABLE').length;
  const outOfStock = products.filter(p => p.status === 'OUT_OF_STOCK').length;

  return (
    <AdminShell>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total de Produtos</span>
          <span className={styles.statValue}>{products.length}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Disponíveis</span>
          <span className={`${styles.statValue} ${styles.statAvailable}`}>{available}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Esgotados</span>
          <span className={`${styles.statValue} ${styles.statSold}`}>{outOfStock}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pedidos</span>
          <span className={styles.statValue}>{stats.total}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Faturamento</span>
          <span className={styles.statValue}>{formatPrice(stats.revenue)}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
        <div className={styles.actions}>
          <a href="/admin/produtos/novo" className="btn btn-primary" id="quick-add-product">+ Adicionar produto</a>
          <a href="/admin/produtos" className="btn btn-outline">Gerenciar produtos</a>
        </div>
      </div>

      {orders.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Pedidos Recentes</h2>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Cliente</span>
              <span>Itens</span>
              <span>Total</span>
              <span>Status</span>
              <span>Pagamento</span>
            </div>
            {orders.map(order => (
              <div key={order._id} className={styles.tableRow}>
                <span data-label="Cliente">{order.customer.name}</span>
                <span data-label="Itens">{order.items.reduce((s, i) => s + i.quantity, 0)} item(ns)</span>
                <span data-label="Total">{formatPrice(order.totalAmount)}</span>
                <span data-label="Status">
                  <span className={`badge ${order.status === 'PAID' ? 'badge-available' : 'badge-sold'}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </span>
                <span data-label="Pagamento">{order.paymentMethod ? (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
