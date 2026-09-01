'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { login } from '@/lib/api';
import { SITE_NAME } from '@/lib/site';
import styles from './page.module.css';

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setError('Sessão expirada. Faça login novamente.');
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { access_token, admin } = await login(email, password);
      localStorage.setItem('lf_token', access_token);
      localStorage.setItem('lf_admin', JSON.stringify(admin));
      router.push('/admin/dashboard');
    } catch {
      setError('Credenciais inválidas. Verifique e-mail e senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>{SITE_NAME}</span>
          <span className={styles.brandSub}>Painel Administrativo</span>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" id="admin-email" />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" id="admin-password" />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }} id="admin-login-btn">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <AdminLoginInner />
    </Suspense>
  );
}
