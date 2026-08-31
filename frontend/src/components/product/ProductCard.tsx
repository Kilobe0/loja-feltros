import Link from 'next/link';
import Image from 'next/image';
import { Product, priceLabel, statusBadge, getImageUrl } from '@/lib/api';
import styles from './ProductCard.module.css';

interface Props {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: Props) {
  const badge = statusBadge(product.status);

  return (
    <Link href={`/produto/${product.slug}`} className={styles.card} id={`product-${product.slug}`}>
      <div className={styles.imageWrapper}>
        <Image
          src={getImageUrl(product.images[0])}
          alt={product.title}
          fill
          style={{ objectFit: 'cover' }}
          priority={priority}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        {product.status === 'OUT_OF_STOCK' && (
          <span className={`badge ${badge.cls} ${styles.badgeOverlay}`}>{badge.label}</span>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.category}>{product.category?.name}</div>
        <h3 className={styles.title}>{product.title}</h3>
        <div className={styles.price}>{priceLabel(product)}</div>
      </div>
    </Link>
  );
}
