import type { Metadata } from 'next';

// Fluxo de compra não deve aparecer em buscadores.
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
