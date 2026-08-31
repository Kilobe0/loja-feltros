import type { Metadata } from 'next';
import ToastHost from '@/components/admin/Toast';

// Área administrativa não deve aparecer em buscadores.
export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}
