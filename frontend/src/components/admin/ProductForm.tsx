'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import { createProduct, updateProduct, uploadImage, Product, ProductVariant, Category, getImageUrl } from '@/lib/api';
import { toast } from '@/components/admin/Toast';
import styles from './ProductForm.module.css';

interface Props {
  initial?: Product;
  categories: Category[];
  token: string;
  onSaved: (product: Product) => void;
  submitLabel: string;
}

interface VariantDraft { name: string; image: string; quantity: string }

export default function ProductForm({ initial, categories, token, onSaved, submitLabel }: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [variants, setVariants] = useState<VariantDraft[]>(
    (initial?.variants ?? []).map(v => ({ name: v.name, image: v.image, quantity: String(v.quantity) })),
  );

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    attributes: initial?.attributes ?? '',
    dimensions: initial?.dimensions ?? '',
    weight: initial?.weight != null ? String(Math.round(initial.weight * 1000)) : '',
    price: initial ? String(initial.price) : '',
    quantity: initial ? String(initial.quantity ?? 1) : '1',
    featured: initial?.featured ?? false,
    category: initial?.category?._id ?? '',
  });

  function updateField(k: string, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(e.target.files[0], token);
      setImages(prev => [...prev, url]);
      toast('Imagem enviada');
    } catch (err: any) {
      toast(err.message || 'Erro ao enviar a imagem', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleVariantImageUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(e.target.files[0], token);
      setVariants(prev => prev.map((v, i) => (i === index ? { ...v, image: url } : v)));
    } catch (err: any) {
      toast(err.message || 'Erro ao enviar a imagem', 'error');
    } finally {
      setUploading(false);
    }
  }

  function addVariant() {
    setVariants(prev => [...prev, { name: '', image: '', quantity: '0' }]);
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants(prev => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function removeVariant(index: number) {
    setVariants(prev => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category) { toast('Selecione uma categoria', 'error'); return; }
    if (images.length === 0) { toast('Adicione ao menos uma imagem', 'error'); return; }
    if (variants.some(v => !v.name.trim() || !v.image)) {
      toast('Cada variação precisa de nome e imagem', 'error');
      return;
    }
    const grams = form.weight.replace(/\D/g, '');
    if (form.weight.trim() !== '' && grams === '') {
      toast('Peso inválido — digite em gramas, ex: 50', 'error');
      return;
    }

    const parsedVariants: ProductVariant[] = variants.map(v => ({
      name: v.name.trim(),
      image: v.image,
      quantity: Math.max(0, Number(v.quantity) || 0),
    }));

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        attributes: form.attributes || undefined,
        dimensions: form.dimensions,
        price: Number(form.price),
        quantity: Math.max(0, Number(form.quantity) || 0),
        weight: grams === '' ? undefined : Number(grams) / 1000,
        featured: form.featured,
        category: form.category,
        images,
        variants: parsedVariants,
      };
      const saved = initial
        ? await updateProduct(initial._id, payload as any, token)
        : await createProduct(payload as any, token);
      toast(`Produto "${form.title}" salvo com sucesso`, 'success', { flash: true });
      onSaved(saved);
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar o produto', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.columns}>
        <div className={styles.left}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Informações básicas</h2>
            <div className="form-group">
              <label className="form-label">Título *</label>
              <input className="form-input" value={form.title} onChange={e => updateField('title', e.target.value)} required id="product-title" />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-textarea" rows={4} value={form.description} onChange={e => updateField('description', e.target.value)} id="product-desc" />
            </div>
            <div className="form-group">
              <label className="form-label">Detalhes (opcional)</label>
              <input className="form-input" value={form.attributes} onChange={e => updateField('attributes', e.target.value)} placeholder="ex: Feltro 100% poliéster, enchimento fiberfill" id="product-attributes" />
            </div>
            <div className={styles.row}>
              <div className="form-group">
                <label className="form-label">Dimensões *</label>
                <input className="form-input" value={form.dimensions} onChange={e => updateField('dimensions', e.target.value)} required placeholder="ex: 10 x 10 x 5 cm" id="product-dimensions" />
              </div>
              <div className="form-group">
                <label className="form-label">Peso (gramas)</label>
                <input className="form-input" type="text" inputMode="numeric" value={form.weight} onChange={e => updateField('weight', e.target.value)} placeholder="ex: 50" id="product-weight" />
              </div>
            </div>
            <div className={styles.row}>
              <div className="form-group">
                <label className="form-label">Preço (R$) *</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.price} onChange={e => updateField('price', e.target.value)} required id="product-price" />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria *</label>
                <select className="form-select" value={form.category} onChange={e => updateField('category', e.target.value)} required id="product-category">
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {variants.length === 0 && (
              <div className="form-group">
                <label className="form-label">Unidades em estoque</label>
                <input className="form-input" type="number" min="0" step="1" value={form.quantity} onChange={e => updateField('quantity', e.target.value)} id="product-quantity" />
              </div>
            )}

            <label className={styles.checkboxRow}>
              <input type="checkbox" checked={form.featured} onChange={e => updateField('featured', e.target.checked)} id="product-featured" />
              <span className="form-label" style={{ margin: 0 }}>Produto em destaque</span>
            </label>
          </section>

          <section className={styles.section}>
            <div className={styles.variantsHeader}>
              <h2 className={styles.sectionTitle}>Variações (opcional)</h2>
              <button type="button" className="btn btn-outline btn-sm" onClick={addVariant} id="add-variant-btn">
                <Plus size={14} strokeWidth={2} /> Adicionar variação
              </button>
            </div>
            <p className={styles.hint}>
              Use para cores ou modelos diferentes do mesmo produto (ex.: &quot;Rosa&quot;, &quot;Azul&quot;). Quando
              há variações, o estoque é controlado por cada uma delas.
            </p>
            {variants.map((v, i) => (
              <div key={i} className={styles.variantRow}>
                <div className={styles.variantImage}>
                  {v.image ? (
                    <Image src={getImageUrl(v.image)} alt="" fill style={{ objectFit: 'cover' }} />
                  ) : (
                    <label className={styles.variantUpload}>
                      <input type="file" accept="image/*" onChange={e => handleVariantImageUpload(i, e)} style={{ display: 'none' }} />
                      <Plus size={18} strokeWidth={1.75} />
                    </label>
                  )}
                </div>
                <input
                  className="form-input"
                  placeholder="Nome (ex: Rosa)"
                  value={v.name}
                  onChange={e => updateVariant(i, { name: e.target.value })}
                />
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Estoque"
                  value={v.quantity}
                  onChange={e => updateVariant(i, { quantity: e.target.value })}
                />
                <button type="button" className={styles.removeBtn} onClick={() => removeVariant(i)} aria-label="Remover variação">
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
            ))}
          </section>
        </div>

        <div className={styles.right}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Imagens</h2>
            <div className={styles.imagesGrid}>
              {images.map((img, i) => (
                <div key={i} className={styles.imageThumb}>
                  <Image src={getImageUrl(img)} alt="" fill style={{ objectFit: 'cover' }} />
                  <button type="button" className={styles.removeImage} onClick={() => setImages(p => p.filter((_, j) => j !== i))} aria-label="Remover imagem">
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}
              <label className={styles.uploadBtn} id="upload-image-btn">
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                {uploading ? <span>Enviando...</span> : (
                  <>
                    <Plus size={26} strokeWidth={1.75} />
                    <span>Adicionar imagem</span>
                  </>
                )}
              </label>
            </div>
            <p className={styles.hint}>JPG, PNG ou WebP. Máximo 10MB por arquivo.</p>
          </section>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={saving} id="submit-product-btn">
          {saving ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
