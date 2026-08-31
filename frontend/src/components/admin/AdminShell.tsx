'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Inbox, Package, Plus, LogOut } from 'lucide-react';
import styles from './AdminShell.module.css';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', Icon: Inbox },
  { href: '/admin/produtos', label: 'Produtos', Icon: Package },
  { href: '/admin/produtos/novo', label: 'Novo Produto', Icon: Plus },
];

// Casca comum das telas do admin: sidebar no desktop, topbar + barra de
// navegação inferior no mobile.
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    try {
      const a = localStorage.getItem('lf_admin');
      if (a) setAdminName(JSON.parse(a).name ?? '');
    } catch {}
  }, []);

  function logout() {
    localStorage.removeItem('lf_token');
    localStorage.removeItem('lf_admin');
    router.push('/admin/login');
  }

  // "Produtos" não pode acender junto com "Novo Produto" (prefixo em comum).
  const isActive = (href: string) =>
    href === '/admin/produtos' ? pathname === '/admin/produtos' : pathname?.startsWith(href);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <Link href="/admin/dashboard" className={styles.brandLink}>Loja de Feltros</Link>
          <span>Admin</span>
        </div>
        <nav className={styles.sidebarNav}>
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className={`${styles.navItem} ${isActive(href) ? styles.active : ''}`}>
              <Icon size={16} strokeWidth={1.75} /> {label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          {adminName && <span className={styles.adminName}>{adminName}</span>}
          <button onClick={logout} className={styles.logoutBtn}>Sair</button>
        </div>
      </aside>

      <header className={styles.topbar}>
        <Link href="/admin/dashboard" className={styles.topbarBrand}>
          Loja de Feltros <span>Admin</span>
        </Link>
        <button onClick={logout} className={styles.topbarLogout} aria-label="Sair">
          <LogOut size={18} strokeWidth={1.75} />
        </button>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.bottomNav} aria-label="Navegação do admin">
        {NAV.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`${styles.bottomNavItem} ${isActive(href) ? styles.bottomActive : ''}`}>
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
