import type { Metadata } from 'next';
import { Quicksand, Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import SiteChrome from '@/components/layout/SiteChrome';
import { SITE_URL, SITE_NAME } from '@/lib/site';

const title = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: 'Produtos artesanais de feltro — chaveiros, bonecos e enfeites feitos à mão.',
  keywords: ['feltro', 'artesanato', 'chaveiros de feltro', 'bonecos de feltro', 'enfeites de feltro'],
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: './',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: 'Produtos artesanais de feltro feitos à mão.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Aplica o tema antes do primeiro paint para não piscar claro→escuro
  const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

  return (
    <html lang="pt-BR" className={`${title.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <CartProvider>
          <SiteChrome>{children}</SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
