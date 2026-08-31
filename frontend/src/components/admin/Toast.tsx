'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './Toast.module.css';

type ToastData = { message: string; type: 'success' | 'error' };

const EVENT = 'lf-admin-toast';
const FLASH_KEY = 'lf_admin_toast';

// Mostra um toast na página atual. Com { flash: true }, guarda a mensagem
// para aparecer depois da próxima navegação (ex.: salvar e voltar pra lista).
export function toast(
  message: string,
  type: ToastData['type'] = 'success',
  opts?: { flash?: boolean },
) {
  if (opts?.flash) {
    sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message, type }));
    return;
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, type } }));
}

export default function ToastHost() {
  const pathname = usePathname();
  const [current, setCurrent] = useState<ToastData | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;
    let leaveTimer: ReturnType<typeof setTimeout>;

    function show(t: ToastData) {
      clearTimeout(hideTimer);
      clearTimeout(leaveTimer);
      setLeaving(false);
      setCurrent(t);
      hideTimer = setTimeout(() => {
        setLeaving(true);
        leaveTimer = setTimeout(() => setCurrent(null), 300);
      }, 4000);
    }

    const onEvent = (e: Event) => show((e as CustomEvent<ToastData>).detail);
    window.addEventListener(EVENT, onEvent);

    const flash = sessionStorage.getItem(FLASH_KEY);
    if (flash) {
      sessionStorage.removeItem(FLASH_KEY);
      try { show(JSON.parse(flash)); } catch {}
    }

    return () => {
      window.removeEventListener(EVENT, onEvent);
      clearTimeout(hideTimer);
      clearTimeout(leaveTimer);
    };
  }, [pathname]);

  if (!current) return null;

  return (
    <div
      className={`${styles.toast} ${styles[current.type]} ${leaving ? styles.leaving : ''}`}
      role="status"
      aria-live="polite"
      id="admin-toast"
    >
      {current.type === 'success'
        ? <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
        : <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />}
      <span>{current.message}</span>
    </div>
  );
}
