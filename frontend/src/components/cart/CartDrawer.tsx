'use client';
import { Lock, Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatPrice, getImageUrl } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const { items, removeItem, setQuantity, clearCart, total, isOpen, closeCart } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.overlay} onClick={closeCart} aria-hidden="true" />
      <aside className={styles.drawer} role="dialog" aria-label="Carrinho de compras" aria-modal="true">
        <div className={styles.header}>
          <h2 className={styles.title}>
            Carrinho
            {items.length > 0 && (
              <span className={styles.itemCount}>· {items.length} {items.length === 1 ? 'item' : 'itens'}</span>
            )}
          </h2>
          <button onClick={closeCart} className={styles.closeBtn} aria-label="Fechar carrinho" id="close-cart-btn">
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div className={styles.body}>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden="true">🧵</span>
              <p className={styles.emptyText}>Seu carrinho está vazio</p>
              <p className={styles.emptyHint}>Explore os produtos e adicione o que você gostar.</p>
              <Link href="/" className="btn btn-outline" onClick={closeCart} style={{ marginTop: 'var(--sp-2)' }}>
                Ver produtos
              </Link>
            </div>
          ) : (
            <>
              <ul className={styles.items} role="list">
                {items.map(item => {
                  const variantImage = item.variant
                    ? item.product.variants?.find(v => v.name === item.variant)?.image
                    : undefined;
                  const key = `${item.product._id}-${item.variant ?? ''}`;
                  return (
                    <li key={key} className={styles.item}>
                      <div className={styles.itemImage}>
                        <Image
                          src={getImageUrl(variantImage || item.product.images[0])}
                          alt={item.product.title}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="72px"
                        />
                      </div>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemTitle}>
                          {item.product.title}
                          {item.variant ? ` — ${item.variant}` : ''}
                        </span>
                        <span className={styles.itemPrice}>{formatPrice(item.product.price)}</span>
                        <div className={styles.qtyControl}>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => setQuantity(item.product._id, item.variant, item.quantity - 1)}
                            aria-label="Diminuir quantidade"
                            disabled={item.quantity <= 1}
                          >
                            <Minus size={13} strokeWidth={2} />
                          </button>
                          <span className={styles.qtyValue}>{item.quantity}</span>
                          <button
                            className={styles.qtyBtn}
                            onClick={() => setQuantity(item.product._id, item.variant, item.quantity + 1)}
                            aria-label="Aumentar quantidade"
                          >
                            <Plus size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product._id, item.variant)}
                        className={styles.removeBtn}
                        aria-label={`Remover ${item.product.title} do carrinho`}
                      >
                        <X size={15} strokeWidth={2} />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.footer}>
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>Total</span>
                  <span className={styles.totalValue}>{formatPrice(total)}</span>
                </div>

                <Link href="/checkout" className={styles.checkoutBtn} onClick={closeCart} id="checkout-btn">
                  Finalizar compra
                </Link>

                <p className={styles.secureNote}>
                  <Lock size={12} strokeWidth={1.75} aria-hidden="true" />
                  Compra segura · Pix, Cartão ou Boleto
                </p>

                <button onClick={clearCart} className={styles.clearBtn}>
                  Esvaziar carrinho
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
