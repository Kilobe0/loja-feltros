'use client';
import { useEffect, useState } from 'react';
import { getProducts, getCategories, Product, Category } from '@/lib/api';
import ProductCard from '@/components/product/ProductCard';
import styles from './page.module.css';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
    const cat = categories.find(c => c.slug === activeCategory);
    getProducts(cat ? { category: cat._id } : undefined)
      .then(setProducts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [activeCategory, categories]);

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Abas de categoria — grade de produtos aparece direto, sem hero */}
        <nav className={styles.tabs} aria-label="Categorias">
          <button
            className={`${styles.tab} ${!activeCategory ? styles.tabActive : ''}`}
            onClick={() => setActiveCategory('')}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat._id}
              className={`${styles.tab} ${activeCategory === cat.slug ? styles.tabActive : ''}`}
              onClick={() => setActiveCategory(cat.slug)}
              id={`tab-${cat.slug}`}
            >
              {cat.name}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className={styles.grid} aria-busy="true" aria-label="Carregando produtos">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={`skeleton ${styles.skeletonImage}`} />
                <div className={`skeleton ${styles.skeletonLine}`} />
                <div className={`skeleton ${styles.skeletonLineShort}`} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.empty} role="status">
            <p className={styles.emptyText}>Não foi possível carregar os produtos agora. Tente novamente em instantes.</p>
          </div>
        ) : products.length === 0 ? (
          <div className={styles.empty} role="status">
            <span className={styles.emptyIcon} aria-hidden="true">🧵</span>
            <p className={styles.emptyText}>Nenhum produto encontrado nesta categoria.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {products.map((product, i) => (
              <ProductCard key={product._id} product={product} priority={i < 4} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
