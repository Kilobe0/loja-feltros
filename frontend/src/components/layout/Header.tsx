'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/lib/cart';
import ThemeToggle from './ThemeToggle';
import styles from './Header.module.css';
import { SITE_NAME } from '@/lib/site';

export default function Header() {
  const { count, openCart } = useCart();

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.logo} aria-label={`${SITE_NAME} — página inicial`}>
          <Image src="/logo.svg" alt={SITE_NAME} width={168} height={80} priority className={styles.logoImg} />
        </Link>

        <div className={styles.actions}>
          <ThemeToggle />
          <button
            onClick={openCart}
            className={styles.cartBtn}
            aria-label={`Carrinho (${count} itens)`}
            id="cart-button"
          >
            <CartIcon />
            {count > 0 && <span className={styles.cartBadge}>{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}
