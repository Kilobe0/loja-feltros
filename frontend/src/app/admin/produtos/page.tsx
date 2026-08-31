'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProducts, deleteProduct, Product, formatPrice, getImageUrl, statusBadge, availableStock } from '@/lib/api';
import { toast } from '@/components/admin/Toast';
import AdminShell from '@/components/admin/AdminShell';
import styles from './page.module.css';

export default function AdminProdutosPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('lf_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    loadProducts();
  }, []);

  async function loadProducts() {
    const list = await getProducts().catch(() => []);
    setProducts(list);
    setLoading(false);
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Remover o produto "${title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleting(id);
    try {
      await deleteProduct(id, token);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast(`Produto "${title}" removido`);
    } catch (e: any) {
      toast(e.message || 'Erro ao remover o produto', 'error');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AdminShell>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Gerenciar Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn btn-primary" id="add-product-btn">+ Novo produto</Link>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando...</div>
      ) : products.length === 0 ? (
        <p className={styles.empty}>Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className={styles.grid}>
          {products.map(product => (
            <div key={product._id} className={styles.card}>
              <div className={styles.cardImage}>
                <Image src={getImageUrl(product.images[0])} alt={product.title} fill style={{ objectFit: 'cover' }} />
                <span className={`badge ${statusBadge(product.status).cls}`} style={{ position: 'absolute', top: 8, left: 8 }}>
                  {statusBadge(product.status).label}
                </span>
              </div>
              <div className={styles.cardBody}>
                <div>
                  <h3 className={styles.cardTitle}>{product.title}</h3>
                  <p className={styles.cardMeta}>{product.category?.name} · {availableStock(product)} em estoque</p>
                  <p className={styles.cardPrice}>{formatPrice(product.price)}</p>
                </div>
                <div className={styles.cardActions}>
                  <Link href={`/admin/produtos/editar?id=${product._id}`} className="btn btn-outline" style={{ flex: 1 }} id={`edit-${product._id}`}>
                    Editar
                  </Link>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(product._id, product.title)} disabled={deleting === product._id} id={`delete-${product._id}`}>
                    {deleting === product._id ? '...' : 'Remover'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
