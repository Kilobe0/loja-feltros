'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { Product, priceLabel, statusBadge, getImageUrl, availableStock } from '@/lib/api';
import { useCart } from '@/lib/cart';
import ProductCard from './ProductCard';
import styles from './ProductDetail.module.css';

interface Props {
  product: Product;
  related: Product[];
}

export default function ProductDetail({ product, related }: Props) {
  const { addItem, openCart } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const variants = product.variants ?? [];
  const hasVariants = variants.length > 0;
  const needsVariant = hasVariants && !selectedVariant;

  const stock = hasVariants
    ? (selectedVariant ? variants.find(v => v.name === selectedVariant)?.quantity ?? 0 : 0)
    : availableStock(product);
  const isAvailable = product.status === 'AVAILABLE' && stock > 0;

  function selectVariant(name: string, image: string) {
    setSelectedVariant(name);
    setQuantity(1);
    const idx = product.images.indexOf(image);
    if (idx >= 0) setActiveImage(idx);
  }

  function handleAddToCart() {
    if (needsVariant || !isAvailable) return;
    addItem(product, selectedVariant ?? undefined, quantity);
    openCart();
  }

  const categoryName = product.category?.name ?? '';

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.breadcrumb}>
          <Link href="/">Produtos</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.title}</span>
        </div>

        <div className={styles.layout}>
          {/* ── Imagens ── */}
          <div className={styles.images}>
            <div className={styles.mainImage}>
              <Image
                src={getImageUrl(product.images[activeImage] || product.images[0])}
                alt={product.title}
                fill
                style={{ objectFit: 'cover' }}
                priority
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            </div>
            {product.images.length > 1 && (
              <div className={styles.thumbnails} role="tablist" aria-label="Galeria de imagens">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    role="tab"
                    className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImage(i)}
                    aria-label={`Ver imagem ${i + 1}`}
                    aria-selected={i === activeImage}
                  >
                    <Image src={getImageUrl(img)} alt="" fill style={{ objectFit: 'cover' }} sizes="72px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info ── */}
          <div className={styles.info}>
            {categoryName && <div className={styles.category}>{categoryName}</div>}
            <h1 className={styles.title}>{product.title}</h1>

            <div className={styles.price}>{priceLabel(product)}</div>

            <div className={styles.statusRow}>
              <span className={`badge ${statusBadge(product.status).cls}`}>
                {statusBadge(product.status).label}
              </span>
              {!hasVariants && isAvailable && (
                <span className={styles.stockNote}>{stock} em estoque</span>
              )}
            </div>

            {product.description && <p className={styles.description}>{product.description}</p>}

            <dl className={styles.specs}>
              {product.attributes && (
                <div className={styles.spec}>
                  <dt>Detalhes</dt>
                  <dd>{product.attributes}</dd>
                </div>
              )}
              {product.dimensions && (
                <div className={styles.spec}>
                  <dt>Dimensões</dt>
                  <dd>{product.dimensions}</dd>
                </div>
              )}
              {!!product.weight && (
                <div className={styles.spec}>
                  <dt>Peso</dt>
                  <dd>{product.weight < 1 ? `${Math.round(product.weight * 1000)} g` : `${product.weight.toLocaleString('pt-BR')} kg`}</dd>
                </div>
              )}
            </dl>

            {hasVariants && (
              <div className={styles.variantSection} role="radiogroup" aria-label="Selecione uma variação">
                <span className={styles.variantLabel}>Escolha uma opção</span>
                <div className={styles.variantOptions}>
                  {variants.map(v => {
                    const outOfStock = v.quantity <= 0;
                    const active = selectedVariant === v.name;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={outOfStock}
                        className={`${styles.variantBtn} ${active ? styles.variantActive : ''} ${outOfStock ? styles.variantSold : ''}`}
                        onClick={() => selectVariant(v.name, v.image)}
                        id={`variant-${v.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <span className={styles.variantThumb}>
                          <Image src={getImageUrl(v.image)} alt="" fill style={{ objectFit: 'cover' }} sizes="56px" />
                        </span>
                        <span className={styles.variantName}>{v.name}</span>
                        {outOfStock && <span className={styles.variantSoldTag}>Esgotado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantidade */}
            {(!hasVariants || selectedVariant) && isAvailable && (
              <div className={styles.qtyRow}>
                <span className={styles.qtyLabel}>Quantidade</span>
                <div className={styles.qtyControl}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus size={14} strokeWidth={2} />
                  </button>
                  <span className={styles.qtyValue}>{quantity}</span>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => setQuantity(q => Math.min(stock, q + 1))}
                    disabled={quantity >= stock}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            <button
              className={styles.addToCartBtn}
              onClick={handleAddToCart}
              disabled={!isAvailable || needsVariant}
              id={`add-to-cart-${product.slug}`}
            >
              {!isAvailable
                ? 'Produto esgotado'
                : needsVariant
                  ? 'Selecione uma opção'
                  : 'Adicionar ao carrinho'}
            </button>
          </div>
        </div>

        {related.length > 0 && (
          <section className={styles.related} aria-label="Produtos relacionados">
            <h2 className={styles.relatedTitle}>Você também pode gostar</h2>
            <div className={styles.relatedGrid}>
              {related.map(r => (
                <ProductCard key={r._id} product={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
