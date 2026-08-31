'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCategories, Category } from '@/lib/api';
import ProductForm from '@/components/admin/ProductForm';
import AdminShell from '@/components/admin/AdminShell';
import styles from './page.module.css';

export default function NovoProdutoPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const t = localStorage.getItem('lf_token');
    if (!t) { router.push('/admin/login'); return; }
    setToken(t);
    getCategories().then(setCategories).catch(() => {});
  }, []);

  return (
    <AdminShell>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Novo Produto</h1>
        <Link href="/admin/produtos" className="btn btn-outline"><ArrowLeft size={16} strokeWidth={1.75} /> Voltar</Link>
      </div>

      {token && (
        <ProductForm
          categories={categories}
          token={token}
          submitLabel="Salvar produto"
          onSaved={() => router.push('/admin/produtos')}
        />
      )}
    </AdminShell>
  );
}
