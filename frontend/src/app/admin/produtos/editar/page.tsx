'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getProducts, getCategories, Product, Category } from '@/lib/api';
import ProductForm from '@/components/admin/ProductForm';
import AdminShell from '@/components/admin/AdminShell';
import styles from '../novo/page.module.css';

// Acesso por URL (?id=...) a partir da lista de produtos.
function EditarProdutoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id') || '';

  const [token, setToken] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('lf_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    getCategories().then(setCategories).catch(() => {});

    // Sem endpoint de busca por id: carrega a lista e localiza o produto.
    getProducts()
      .then(list => {
        const p = list.find(x => x._id === id);
        if (!p) { setNotFound(true); return; }
        setProduct(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingData(false));
  }, [id]);

  return (
    <AdminShell>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Editar Produto</h1>
        <Link href="/admin/produtos" className="btn btn-outline"><ArrowLeft size={16} strokeWidth={1.75} /> Voltar</Link>
      </div>

      {loadingData ? (
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      ) : notFound || !product ? (
        <p style={{ color: 'var(--text-muted)' }}>
          Produto não encontrado. <Link href="/admin/produtos" style={{ color: 'var(--accent)' }}>Voltar para a lista</Link>.
        </p>
      ) : (
        <ProductForm
          initial={product}
          categories={categories}
          token={token}
          submitLabel="Salvar alterações"
          onSaved={() => router.push('/admin/produtos')}
        />
      )}
    </AdminShell>
  );
}

export default function EditarProdutoPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <EditarProdutoInner />
    </Suspense>
  );
}
