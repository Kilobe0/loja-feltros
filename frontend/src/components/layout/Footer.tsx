import { WHATSAPP_URL } from '@/lib/site';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <span className={styles.brand}>Loja de Feltros</span>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.whatsapp}>
          <WhatsappIcon /> Fale conosco no WhatsApp
        </a>
        <p className={styles.copy}>© {new Date().getFullYear()} Loja de Feltros. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

function WhatsappIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.9 9.9 0 004.76 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.02h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.13.82.84-3.05-.2-.32a8.2 8.2 0 01-1.26-4.36c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.86 5.8 2.4a8.15 8.15 0 012.4 5.8c0 4.52-3.68 8.2-8.16 8.2z" />
    </svg>
  );
}
