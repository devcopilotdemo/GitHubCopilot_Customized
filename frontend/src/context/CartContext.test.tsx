import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartProvider, useCart, type Product } from './CartContext';

const discountedProduct: Product = {
  productId: 7,
  name: 'Smart Water Fountain',
  price: 20,
  imgName: 'water-fountain.png',
  discount: 0.25,
};

function CartWrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

describe('CartProvider', () => {
  it('adds discounted products, merges duplicate additions, and calculates totals in cents', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartWrapper });

    act(() => {
      result.current.addItem(discountedProduct, 2);
      result.current.addItem(discountedProduct, 3);
    });

    expect(result.current.items).toEqual([
      {
        productId: 7,
        name: 'Smart Water Fountain',
        imgName: 'water-fountain.png',
        unitPriceCents: 1500,
        quantity: 5,
      },
    ]);
    expect(result.current.itemCount).toBe(5);
    expect(result.current.subtotal).toBe(7500);
    expect(result.current.shipping).toBe(1000);
    expect(result.current.grandTotal).toBe(8500);
  });

  it('accepts positive safe integer quantities and removes an item at zero', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartWrapper });

    act(() => result.current.addItem(discountedProduct, 1));
    act(() => result.current.updateQuantity(discountedProduct.productId, 4));
    expect(result.current.items[0]?.quantity).toBe(4);

    act(() => result.current.updateQuantity(discountedProduct.productId, 0));

    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.shipping).toBe(0);
    expect(result.current.grandTotal).toBe(0);
  });

  it('ignores negative, fractional, and unsafe quantities without mutating the cart', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartWrapper });

    act(() => {
      result.current.addItem(discountedProduct, -1);
      result.current.addItem(discountedProduct, 1.5);
      result.current.addItem(discountedProduct, Number.MAX_SAFE_INTEGER + 1);
      result.current.addItem(discountedProduct, 2);
    });

    act(() => {
      result.current.updateQuantity(discountedProduct.productId, -1);
      result.current.updateQuantity(discountedProduct.productId, 1.5);
      result.current.updateQuantity(discountedProduct.productId, Number.MAX_SAFE_INTEGER + 1);
    });

    expect(result.current.items[0]?.quantity).toBe(2);
    expect(result.current.itemCount).toBe(2);
  });

  it('applies SAVE5 case-insensitively, trims the code, and reports invalid codes', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartWrapper });

    act(() => result.current.addItem(discountedProduct, 2));
    const totalsBeforeCoupon = {
      subtotal: result.current.subtotal,
      shipping: result.current.shipping,
      grandTotal: result.current.grandTotal,
    };

    act(() => {
      expect(result.current.applyCoupon('  sAvE5 ')).toBe(true);
    });

    expect(result.current.couponCode).toBe('SAVE5');
    expect(result.current.couponDiscount).toBe(150);
    expect(result.current.grandTotal).toBe(3850);
    expect(result.current.couponError).toBeNull();

    act(() => {
      expect(result.current.applyCoupon('unknown')).toBe(false);
    });

    expect(result.current.subtotal).toBe(totalsBeforeCoupon.subtotal);
    expect(result.current.shipping).toBe(totalsBeforeCoupon.shipping);
    expect(result.current.grandTotal).toBe(3850);
    expect(result.current.couponError).toBe('That coupon code is not valid.');

    act(() => {
      expect(result.current.applyCoupon('   ')).toBe(false);
    });

    expect(result.current.grandTotal).toBe(3850);
    expect(result.current.couponError).toBe('Enter a coupon code.');
  });

  it('clears the coupon when the last item is removed', () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartWrapper });

    act(() => {
      result.current.addItem(discountedProduct);
      result.current.applyCoupon('SAVE5');
    });
    expect(result.current.couponCode).toBe('SAVE5');

    act(() => result.current.removeItem(discountedProduct.productId));

    expect(result.current.items).toEqual([]);
    expect(result.current.couponCode).toBeNull();
    expect(result.current.couponError).toBeNull();
  });

  it('restores valid cart state after a provider is remounted', () => {
    const firstRender = renderHook(() => useCart(), { wrapper: CartWrapper });

    act(() => {
      firstRender.result.current.addItem(discountedProduct, 2);
      firstRender.result.current.applyCoupon('SAVE5');
    });
    firstRender.unmount();

    const reloaded = renderHook(() => useCart(), { wrapper: CartWrapper });

    expect(reloaded.result.current.items[0]?.quantity).toBe(2);
    expect(reloaded.result.current.items[0]?.unitPriceCents).toBe(1500);
    expect(reloaded.result.current.couponCode).toBe('SAVE5');
    expect(reloaded.result.current.couponDiscount).toBe(150);
    expect(reloaded.result.current.grandTotal).toBe(3850);
  });

  it.each([
    ['malformed JSON', '{not-json'],
    [
      'unsupported version',
      JSON.stringify({ version: 99, items: [], couponCode: null }),
    ],
  ])('resets safely for %s persisted state', (_description, storedValue) => {
    window.localStorage.setItem('octocat-cart-v1', storedValue);

    const { result } = renderHook(() => useCart(), { wrapper: CartWrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.couponCode).toBeNull();
    expect(result.current.itemCount).toBe(0);
    expect(result.current.grandTotal).toBe(0);
  });
});