/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'octocat-cart-v1';
const STORAGE_VERSION = 1;
const SHIPPING_CENTS = 1000;
const SAVE5_CODE = 'SAVE5';

export interface Product {
  productId: number;
  name: string;
  price: number;
  imgName: string;
  discount?: number;
}

export interface CartItem {
  productId: number;
  name: string;
  imgName: string;
  unitPriceCents: number;
  quantity: number;
}

export interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  couponDiscount: number;
  shipping: number;
  grandTotal: number;
  couponCode: string | null;
  couponError: string | null;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
}

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  couponError: string | null;
}

interface PersistedCart {
  version: number;
  items: CartItem[];
  couponCode?: string | null;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function emptyCartState(): CartState {
  return { items: [], couponCode: null, couponError: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function isValidProductId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isValidProductId(value.productId) &&
    typeof value.name === 'string' &&
    typeof value.imgName === 'string' &&
    typeof value.unitPriceCents === 'number' &&
    Number.isSafeInteger(value.unitPriceCents) &&
    value.unitPriceCents >= 0 &&
    isValidQuantity(value.quantity)
  );
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadPersistedCart(): CartState {
  const storage = getStorage();
  if (!storage) {
    return emptyCartState();
  }

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return emptyCartState();
    }

    const parsed: unknown = JSON.parse(rawValue);
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.items)) {
      return emptyCartState();
    }

    if (!parsed.items.every(isCartItem)) {
      return emptyCartState();
    }

    const persistedCoupon = parsed.couponCode;
    if (
      persistedCoupon !== undefined &&
      persistedCoupon !== null &&
      typeof persistedCoupon !== 'string'
    ) {
      return emptyCartState();
    }

    const normalizedCoupon = persistedCoupon?.trim().toUpperCase() || null;
    if (normalizedCoupon !== null && normalizedCoupon !== SAVE5_CODE) {
      return emptyCartState();
    }

    return {
      items: parsed.items,
      couponCode: normalizedCoupon,
      couponError: null,
    };
  } catch {
    return emptyCartState();
  }
}

function getUnitPriceCents(product: Product): number | null {
  if (!Number.isFinite(product.price)) {
    return null;
  }

  const discount = product.discount ?? 0;
  if (!Number.isFinite(discount)) {
    return null;
  }

  const unitPriceCents = Math.round(product.price * (1 - discount) * 100);
  if (!Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0) {
    return null;
  }

  return unitPriceCents;
}

function createCartItem(product: Product, quantity: number): CartItem | null {
  const unitPriceCents = getUnitPriceCents(product);
  if (unitPriceCents === null || !isValidProductId(product.productId)) {
    return null;
  }

  return {
    productId: product.productId,
    name: product.name,
    imgName: product.imgName,
    unitPriceCents,
    quantity,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartState, setCartState] = useState<CartState>(loadPersistedCart);

  useEffect(() => {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    const persistedCart: PersistedCart = {
      version: STORAGE_VERSION,
      items: cartState.items,
      couponCode: cartState.couponCode,
    };

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(persistedCart));
    } catch {
      return;
    }
  }, [cartState.items, cartState.couponCode]);

  const addItem = (product: Product, quantity = 1) => {
    if ((!isValidQuantity(quantity) && quantity !== 0) || !isValidProductId(product.productId)) {
      return;
    }

    if (quantity === 0) {
      removeItem(product.productId);
      return;
    }

    const newItem = createCartItem(product, quantity);
    if (!newItem) {
      return;
    }

    setCartState((previousState) => {
      const existingItem = previousState.items.find(
        (item) => item.productId === product.productId,
      );

      if (!existingItem) {
        return { ...previousState, items: [...previousState.items, newItem] };
      }

      const mergedQuantity = existingItem.quantity + quantity;
      if (!Number.isSafeInteger(mergedQuantity)) {
        return previousState;
      }

      return {
        ...previousState,
        items: previousState.items.map((item) =>
          item.productId === product.productId ? { ...item, quantity: mergedQuantity } : item,
        ),
      };
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (!isValidProductId(productId) || (!isValidQuantity(quantity) && quantity !== 0)) {
      return;
    }

    setCartState((previousState) => {
      const itemExists = previousState.items.some((item) => item.productId === productId);
      if (!itemExists) {
        return previousState;
      }

      if (quantity === 0) {
        const remainingItems = previousState.items.filter((item) => item.productId !== productId);
        return {
          ...previousState,
          items: remainingItems,
          ...(remainingItems.length === 0
            ? { couponCode: null, couponError: null }
            : {}),
        };
      }

      return {
        ...previousState,
        items: previousState.items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        ),
      };
    });
  };

  const removeItem = (productId: number) => {
    if (!isValidProductId(productId)) {
      return;
    }

    setCartState((previousState) => {
      const remainingItems = previousState.items.filter((item) => item.productId !== productId);
      if (remainingItems.length === previousState.items.length) {
        return previousState;
      }

      return {
        ...previousState,
        items: remainingItems,
        ...(remainingItems.length === 0 ? { couponCode: null, couponError: null } : {}),
      };
    });
  };

  const clearCart = () => {
    setCartState(emptyCartState());
  };

  const applyCoupon = (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode === SAVE5_CODE) {
      setCartState((previousState) => ({
        ...previousState,
        couponCode: SAVE5_CODE,
        couponError: null,
      }));
      return true;
    }

    setCartState((previousState) => ({
      ...previousState,
      couponError: normalizedCode ? 'That coupon code is not valid.' : 'Enter a coupon code.',
    }));
    return false;
  };

  const removeCoupon = () => {
    setCartState((previousState) => ({
      ...previousState,
      couponCode: null,
      couponError: null,
    }));
  };

  const itemCount = cartState.items.reduce((count, item) => count + item.quantity, 0);
  const subtotal = cartState.items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0,
  );
  const couponDiscount = cartState.couponCode === SAVE5_CODE ? Math.round(subtotal * 0.05) : 0;
  const shipping = cartState.items.length > 0 ? SHIPPING_CENTS : 0;
  const grandTotal = subtotal - couponDiscount + shipping;

  return (
    <CartContext.Provider
      value={{
        items: cartState.items,
        itemCount,
        subtotal,
        couponDiscount,
        shipping,
        grandTotal,
        couponCode: cartState.couponCode,
        couponError: cartState.couponError,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        applyCoupon,
        removeCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}