'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getProductBySlug, getRelatedProducts, Product } from '@/lib/api';
import ProductDetail from '@/components/product/ProductDetail';
import styles from './page.module.css';

interface Props {
  params: Promise<{ slug: string }>;
}

export default function ProdutoPage({ params }: Props) {
  const { slug } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getProductBySlug(slug)
      .then(async p => {
        if (cancelled) return;
        setProduct(p);
        const categoryId = typeof p.category === 'object' ? p.category._id : p.category;
        const rel = await getRelatedProducts(p._id, categoryId as string).catch(() => []);
        if (!cancelled) setRelated(rel);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return <div className={styles.loading} aria-busy="true" />;
  }

  if (notFound || !product) {
    return (
      <div className={styles.notFound}>
        <h1>Produto não encontrado</h1>
        <p>O produto que você procura não existe ou foi removido.</p>
        <Link href="/" className="btn btn-primary">Voltar aos produtos</Link>
      </div>
    );
  }

  return <ProductDetail product={product} related={related} />;
}
