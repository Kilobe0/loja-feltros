'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Lock, Package, Clock, Info, Truck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import {
  createOrder, formatPrice, getImageUrl, getOrderStatus, quoteShipping,
  loadCheckoutSession, saveCheckoutSession, clearCheckoutSession,
  CHECKOUT_SESSION_TTL_MS, type CheckoutSession, type ShippingOption,
} from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

interface FormData {
  name: string; email: string; phone: string; cpf: string;
  street: string; number: string; complement: string;
  neighborhood: string; city: string; state: string; zipCode: string;
}

const EMPTY: FormData = {
  name: '', email: '', phone: '', cpf: '',
  street: '', number: '', complement: '',
  neighborhood: '', city: '', state: '', zipCode: '',
};

type CepCheck = 'idle' | 'loading' | 'not-found' | 'ok';
type ShippingState = 'idle' | 'loading' | 'ok' | 'error';

export default function CheckoutPage() {
  const { items, total } = useCart();

  const [form, setForm] = useState<FormData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cepCheck, setCepCheck] = useState<CepCheck>('idle');
  const [showNoShippingDialog, setShowNoShippingDialog] = useState(false);
  const [pendingSession, setPendingSession] = useState<CheckoutSession | null>(null);

  const [shippingState, setShippingState] = useState<ShippingState>('idle');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingSelected, setShippingSelected] = useState<ShippingOption | null>(null);

  const grandTotal = total + (shippingSelected?.price ?? 0);

  const update = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Pagamento em andamento? (cliente foi ao Mercado Pago e voltou sem pagar)
  useEffect(() => {
    const session = loadCheckoutSession();
    if (!session) return;
    getOrderStatus(session.orderId)
      .then(({ status }) => {
        if (status === 'PENDING') setPendingSession(session);
        else clearCheckoutSession();
      })
      .catch(() => setPendingSession(session));
  }, []);

  const dismissSession = () => {
    clearCheckoutSession();
    setPendingSession(null);
  };

  const sessionBanner = pendingSession && (
    <div className={styles.formBlock} role="status" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <Clock size={20} strokeWidth={1.5} aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Você tem um pagamento em andamento.</strong>
          <p style={{ margin: '0.35rem 0 0.85rem', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            Seus itens seguem reservados por até{' '}
            {Math.max(1, Math.round((pendingSession.expiresAt - Date.now()) / 60000))} minutos.
            Dá para voltar ao Mercado Pago e concluir de onde parou.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a href={pendingSession.initPoint} className="btn btn-primary" id="resume-payment-btn">
              Continuar pagamento
            </a>
            <button type="button" className="btn btn-outline" onClick={dismissSession}>
              Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Máscara leve + consulta ao ViaCEP quando o CEP fica completo: preenche o
  // endereço e cota o frete.
  async function handleCep(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    update('zipCode', masked);

    setShippingState('idle');
    setShippingOptions([]);
    setShippingSelected(null);

    if (digits.length < 8) {
      setCepCheck('idle');
      return;
    }

    setCepCheck('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepCheck('not-found');
        return;
      }
      setForm(f => ({
        ...f,
        street: data.logradouro || f.street,
        neighborhood: data.bairro || f.neighborhood,
        city: data.localidade || f.city,
        state: data.uf || f.state,
      }));
      setCepCheck('ok');
      fetchShipping(digits);
    } catch {
      setCepCheck('idle');
    }
  }

  async function fetchShipping(cepDigits: string) {
    setShippingState('loading');
    try {
      const options = await quoteShipping(
        cepDigits,
        items.map(i => ({ productId: i.product._id, quantity: i.quantity })),
      );
      if (options.length === 0) {
        setShippingState('error');
        return;
      }
      setShippingOptions(options);
      setShippingSelected(options[0]);
      setShippingState('ok');
    } catch {
      setShippingState('error');
    }
  }

  const isValid = form.name && form.email && form.cpf;

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className="container--narrow">
          {sessionBanner}
          <div className={styles.emptyCart}>
            <span style={{ fontSize: '2.5rem' }} aria-hidden="true">🧵</span>
            <h1 className={styles.emptyCartTitle}>Carrinho vazio</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Adicione produtos ao carrinho antes de finalizar a compra.
            </p>
            <Link href="/" className="btn btn-primary">
              Ver produtos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    if (!shippingSelected) {
      setShowNoShippingDialog(true);
      return;
    }
    submitOrder();
  }

  async function submitOrder() {
    setLoading(true);
    setError('');
    try {
      const { order, initPoint } = await createOrder({
        customer: {
          name: form.name, email: form.email, phone: form.phone, cpf: form.cpf,
          address: {
            street: form.street, number: form.number, complement: form.complement,
            neighborhood: form.neighborhood, city: form.city, state: form.state, zipCode: form.zipCode,
          },
        },
        items: items.map(i => ({ productId: i.product._id, variant: i.variant, quantity: i.quantity })),
        ...(shippingSelected
          ? { shipping: { company: shippingSelected.company, service: shippingSelected.service } }
          : {}),
      });
      saveCheckoutSession({
        orderId: order._id,
        initPoint,
        expiresAt: Date.now() + CHECKOUT_SESSION_TTL_MS,
      });
      window.location.href = initPoint;
    } catch (e: any) {
      setError(e.message || 'Erro ao processar pedido. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className="container--narrow">
          <span className="label">Compra</span>
          <h1 className={styles.pageTitle}>Finalizar Compra</h1>
        </div>
      </div>

      {sessionBanner && <div className="container--narrow" style={{ marginTop: '1.5rem' }}>{sessionBanner}</div>}

      <div className={styles.layout}>
        <form onSubmit={handleSubmit} className={styles.formSection} noValidate>
          <div className={styles.formBlock}>
            <h2 className={styles.blockTitle}>Dados pessoais</h2>
            <div className={styles.formGrid}>
              <div className={`form-group ${styles.spanFull}`}>
                <label className="form-label" htmlFor="name">Nome completo *</label>
                <input className="form-input" id="name" value={form.name} onChange={e => update('name', e.target.value)} required autoComplete="name" placeholder="Seu nome completo" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="email">E-mail *</label>
                <input className="form-input" id="email" type="email" value={form.email} onChange={e => update('email', e.target.value)} required autoComplete="email" placeholder="seu@email.com" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="phone">Telefone</label>
                <input className="form-input" id="phone" type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} autoComplete="tel" placeholder="(11) 99999-9999" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="cpf">CPF *</label>
                <input className="form-input" id="cpf" value={form.cpf} onChange={e => update('cpf', e.target.value)} required placeholder="000.000.000-00" inputMode="numeric" />
              </div>
            </div>
          </div>

          <div className={styles.formBlock}>
            <h2 className={styles.blockTitle}>Endereço de entrega</h2>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label" htmlFor="zipCode">CEP</label>
                <input className="form-input" id="zipCode" value={form.zipCode} onChange={e => handleCep(e.target.value)} placeholder="00000-000" inputMode="numeric" autoComplete="postal-code" aria-describedby="cep-feedback" />
              </div>
              <div className={styles.spanFull} id="cep-feedback" aria-live="polite">
                {cepCheck === 'loading' && <p className={styles.cepChecking}>Verificando CEP...</p>}
                {cepCheck === 'not-found' && <p className={styles.cepChecking}>CEP não encontrado — confira o número ou preencha o endereço manualmente.</p>}
                {shippingState === 'loading' && <p className={styles.cepChecking}>Calculando frete...</p>}
                {shippingState === 'ok' && (
                  <fieldset className={styles.shippingOptions}>
                    <legend className={styles.shippingLegend}>
                      <Truck size={15} strokeWidth={1.5} aria-hidden="true" /> Escolha o frete
                    </legend>
                    {shippingOptions.map(opt => {
                      const key = `${opt.company}-${opt.service}`;
                      const checked = shippingSelected?.company === opt.company && shippingSelected?.service === opt.service;
                      return (
                        <label key={key} className={`${styles.shippingOption} ${checked ? styles.shippingOptionActive : ''}`}>
                          <input type="radio" name="shipping" checked={checked} onChange={() => setShippingSelected(opt)} />
                          <span className={styles.shippingOptionName}>
                            {opt.service} <span className={styles.shippingOptionCompany}>({opt.company})</span>
                          </span>
                          <span className={styles.shippingOptionEta}>até {opt.deliveryDays} dia{opt.deliveryDays !== 1 ? 's' : ''} úteis</span>
                          <span className={styles.shippingOptionPrice}>{formatPrice(opt.price)}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}
                {shippingState === 'error' && (
                  <div className={styles.cepNotice} role="status">
                    <Info size={18} strokeWidth={1.5} aria-hidden="true" />
                    <div>
                      <strong>Não conseguimos calcular o frete agora.</strong>
                      <p>Confira o CEP ou tente novamente em instantes.</p>
                    </div>
                  </div>
                )}
              </div>
              <div className={`form-group ${styles.spanFull}`}>
                <label className="form-label" htmlFor="street">Rua / Avenida</label>
                <input className="form-input" id="street" value={form.street} onChange={e => update('street', e.target.value)} autoComplete="address-line1" placeholder="Nome da rua ou avenida" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="number">Número</label>
                <input className="form-input" id="number" value={form.number} onChange={e => update('number', e.target.value)} placeholder="123" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="complement">Complemento <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(opcional)</span></label>
                <input className="form-input" id="complement" value={form.complement} onChange={e => update('complement', e.target.value)} autoComplete="address-line2" placeholder="Apto, sala, bloco..." />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="neighborhood">Bairro</label>
                <input className="form-input" id="neighborhood" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="city">Cidade</label>
                <input className="form-input" id="city" value={form.city} onChange={e => update('city', e.target.value)} autoComplete="address-level2" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="state">Estado</label>
                <input className="form-input" id="state" value={form.state} onChange={e => update('state', e.target.value)} placeholder="SP" maxLength={2} autoComplete="address-level1" />
              </div>
            </div>
          </div>

          <div className={styles.formBlock}>
            <h2 className={styles.blockTitle}>Pagamento</h2>
            <p className={styles.paymentNote}>
              <Lock size={14} strokeWidth={1.5} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '0.4em' }} />
              Ao confirmar, você será levado ao ambiente seguro do Mercado Pago para
              escolher e concluir o pagamento (Pix, cartão ou boleto).
            </p>
          </div>

          {error && (
            <div className={styles.errorMsg} role="alert">
              <AlertTriangle size={18} strokeWidth={1.5} aria-hidden="true" />
              {error}
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading || !isValid} id="confirm-order-btn" aria-busy={loading}>
            {loading ? (
              <span className={styles.submitBtnLoading}>
                <span className={styles.spinner} aria-hidden="true" />
                Redirecionando ao pagamento...
              </span>
            ) : (
              `Ir para o pagamento · ${formatPrice(grandTotal)}`
            )}
          </button>

          <div className={styles.trustLine}>
            <span className={styles.trustItem}><Lock size={14} strokeWidth={1.5} aria-hidden="true" /> Compra segura</span>
            <span className={styles.trustItem}><Package size={14} strokeWidth={1.5} aria-hidden="true" /> Entrega com rastreio</span>
          </div>
        </form>

        <aside className={styles.summary} aria-label="Resumo do pedido">
          <div className={styles.summaryHeader}>
            <h2 className={styles.summaryTitle}>Resumo</h2>
          </div>
          <div className={styles.summaryItems}>
            {items.map(item => {
              const variantImage = item.variant
                ? item.product.variants?.find(v => v.name === item.variant)?.image
                : undefined;
              return (
                <div key={`${item.product._id}-${item.variant ?? ''}`} className={styles.summaryItem}>
                  <div className={styles.summaryItemImage}>
                    <Image src={getImageUrl(variantImage || item.product.images[0])} alt={item.product.title} fill style={{ objectFit: 'cover' }} sizes="52px" />
                  </div>
                  <div className={styles.summaryItemInfo}>
                    <span className={styles.summaryItemTitle}>
                      {item.product.title}
                      {item.variant ? ` — ${item.variant}` : ''}
                    </span>
                    <span className={styles.summaryItemQty}>Qtd: {item.quantity}</span>
                  </div>
                  <span className={styles.summaryItemPrice}>{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.summaryFooter}>
            {shippingSelected && (
              <div className={styles.summaryShippingRow}>
                <span>Frete — {shippingSelected.service}</span>
                <span>{formatPrice(shippingSelected.price)}</span>
              </div>
            )}
            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryTotalLabel}>Total</span>
              <span className={styles.summaryTotalValue}>{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </aside>
      </div>

      {showNoShippingDialog && (
        <div className={styles.dialogOverlay} onClick={() => setShowNoShippingDialog(false)} role="presentation">
          <div className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="no-shipping-title" onClick={e => e.stopPropagation()}>
            <span className="label">Atenção</span>
            <h2 id="no-shipping-title" className={styles.dialogTitle}>Nenhum frete calculado</h2>
            <p className={styles.dialogText}>
              Informe o CEP para calcularmos o frete antes de continuar.
            </p>
            <div className={styles.dialogActions}>
              <button type="button" className="btn btn-primary" onClick={() => setShowNoShippingDialog(false)}>
                Voltar e informar o CEP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
