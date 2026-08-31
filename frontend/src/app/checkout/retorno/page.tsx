'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle, type LucideIcon } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { getOrderStatus, clearCheckoutSession } from '@/lib/api';
import styles from '../page.module.css';

type Outcome = 'approved' | 'pending' | 'failure';

// Pix/boleto: o MP redireciona como "pending" e a confirmação chega depois,
// via webhook. Consultamos o pedido neste intervalo até ele sair de PENDING.
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_MS = 15 * 60 * 1000;

function resolveOutcome(status: string | null): Outcome {
  if (status === 'approved') return 'approved';
  if (status === 'pending' || status === 'in_process') return 'pending';
  return 'failure';
}

const CONTENT: Record<Outcome, { Icon: LucideIcon; title: string; text: string }> = {
  approved: {
    Icon: CheckCircle2,
    title: 'Pagamento confirmado!',
    text: 'Obrigado pela sua compra. Vamos preparar o envio e entraremos em contato com os detalhes.',
  },
  pending: {
    Icon: Clock,
    title: 'Pagamento em processamento',
    text: 'Estamos aguardando a confirmação do pagamento — Pix costuma aprovar em segundos. Pode deixar esta página aberta: ela se atualiza sozinha assim que o pagamento for confirmado.',
  },
  failure: {
    Icon: XCircle,
    title: 'Pagamento não concluído',
    text: 'O pagamento não foi finalizado. Os itens voltaram a ficar disponíveis — você pode tentar novamente quando quiser.',
  },
};

function RetornoContent() {
  const params = useSearchParams();
  const { clearCart } = useCart();

  const status = params.get('status') || params.get('collection_status');
  const orderId = params.get('external_reference');
  const [outcome, setOutcome] = useState<Outcome>(() => resolveOutcome(status));
  const { Icon, title, text } = CONTENT[outcome];

  useEffect(() => {
    if (outcome === 'approved' || outcome === 'pending') clearCart();
    if (outcome === 'approved' || outcome === 'failure') clearCheckoutSession();
  }, [outcome, clearCart]);

  useEffect(() => {
    if (outcome !== 'pending' || !orderId) return;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > POLL_MAX_MS) {
        clearInterval(timer);
        return;
      }
      try {
        const { status: orderStatus } = await getOrderStatus(orderId);
        if (orderStatus === 'PAID') setOutcome('approved');
        else if (orderStatus === 'CANCELLED') setOutcome('failure');
      } catch {
        // erro transitório: tenta de novo no próximo tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [outcome, orderId]);

  return (
    <div className={styles.page}>
      <div className="container--narrow">
        <div className={styles.emptyCart}>
          <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
          <h1 className={styles.emptyCartTitle}>{title}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{text}</p>
          {outcome === 'failure' ? (
            <Link href="/checkout" className="btn btn-primary btn-lg">Tentar novamente</Link>
          ) : (
            <Link href="/" className="btn btn-primary btn-lg">Voltar ao início</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RetornoPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <RetornoContent />
    </Suspense>
  );
}
