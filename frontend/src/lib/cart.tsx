'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, availableStock } from './api';

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: string; // Variante específica (ex.: cor) quando o produto tem variantes
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant?: string, quantity?: number) => void;
  removeItem: (productId: string, variant?: string) => void;
  setQuantity: (productId: string, variant: string | undefined, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  hasItem: (productId: string, variant?: string) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

const sameItem = (i: CartItem, id: string, variant?: string) =>
  i.product._id === id && (i.variant ?? null) === (variant ?? null);

// Estoque máximo de um item de carrinho (variante ou produto).
function maxQuantity(product: Product, variant?: string): number {
  if (variant) {
    return product.variants?.find(v => v.name === variant)?.quantity ?? 0;
  }
  return availableStock(product);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lf_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('lf_cart', JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, variant?: string, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => sameItem(i, product._id, variant));
      const max = maxQuantity(product, variant);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, Math.max(max, existing.quantity));
        return prev.map(i => (sameItem(i, product._id, variant) ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { product, quantity: Math.max(1, Math.min(quantity, max || 1)), variant }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string, variant?: string) => {
    setItems(prev => prev.filter(i => !sameItem(i, productId, variant)));
  }, []);

  const setQuantity = useCallback((productId: string, variant: string | undefined, quantity: number) => {
    setItems(prev => prev.map(i => {
      if (!sameItem(i, productId, variant)) return i;
      const max = maxQuantity(i.product, variant);
      return { ...i, quantity: Math.max(1, Math.min(quantity, max || 1)) };
    }));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const hasItem = (id: string, variant?: string) => items.some(i => sameItem(i, id, variant));

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, setQuantity, clearCart,
      total, count, isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      hasItem,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
