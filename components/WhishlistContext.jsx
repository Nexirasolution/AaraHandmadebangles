'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'ahb_wishlist_v1';

// Palette: 60% white/cream · 25% navy · 10% gold · 5% pale gold
// Same toast look as CartContext — keep the two in sync.
const WHITE = '#FFFFFF';
const NAVY_DARK = '#071A3A';
const GOLD = '#C9A227';
const GOLD_PALE = '#E6D39A';

const INK = NAVY_DARK;
const INK_SOFT = 'rgba(16, 42, 86, 0.65)';

const toastStyle = {
  fontSize: '13px',
  fontWeight: 600,
  color: INK,
  background: WHITE,
  borderRadius: '4px',
  padding: '10px 14px',
  boxShadow: '0 4px 16px rgba(7, 26, 58, 0.12)',
  border: `1px solid ${GOLD_PALE}`,
  borderLeft: `3px solid ${GOLD}`,
};

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWishlist(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist, loaded]);

  const addToWishlist = useCallback((productId) => {
    setWishlist((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    toast.success('Added to wishlist', {
      style: toastStyle,
      // Default success icon is green — make it gold to match the theme
      iconTheme: { primary: GOLD, secondary: WHITE },
    });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setWishlist((prev) => prev.filter((id) => id !== productId));
    toast('Removed from wishlist', {
      icon: '✕',
      style: { ...toastStyle, borderLeftColor: INK_SOFT },
    });
  }, []);

  const toggleWishlist = useCallback((productId) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const isWishlisted = useCallback((productId) => wishlist.includes(productId), [wishlist]);

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, toggleWishlist, isWishlisted }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}