import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';
import { useCart } from '../../../context/CartContext';
import type { CartContextValue } from '../../../context/CartContext';
import CartItemRow, { type CartItemRowItem } from './CartItemRow';
import CouponForm from './CouponForm';
import OrderSummary from './OrderSummary';

export interface CartProps {
  isLoading?: boolean;
  productRefreshError?: unknown;
  onRetryProductRefresh?: () => void;
}

const QUANTITY_ERROR = 'Enter a whole number greater than zero.';

const parseQuantity = (value: string) => {
  const trimmedValue = value.trim();
  if (!/^[1-9]\d*$/.test(trimmedValue)) {
    return null;
  }

  const quantity = Number(trimmedValue);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : null;
};

const errorMessage = (error: unknown) => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'We could not refresh product details. Your saved cart is still available.';
};

function LoadingState() {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800" role="status" aria-live="polite">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-primary dark:border-gray-600" aria-hidden="true" />
      <p className="text-sm text-gray-600 dark:text-gray-300">Loading your cart...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-12" aria-labelledby="empty-cart-heading">
      <h2 id="empty-cart-heading" className="text-2xl font-bold text-gray-800 dark:text-light">Your cart is empty</h2>
      <p className="mx-auto mt-3 max-w-md text-sm text-gray-600 dark:text-gray-300">Add a product to your cart and it will appear here.</p>
      <Link
        to="/products"
        className="mt-6 inline-flex min-h-[40px] items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-dark"
      >
        Browse Products
      </Link>
    </section>
  );
}

function RefreshError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[40px] shrink-0 rounded-md border border-red-300 px-4 font-semibold transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 dark:border-red-800 dark:hover:bg-red-950/60 dark:focus:ring-offset-gray-900"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default function Cart({ isLoading = false, productRefreshError, onRetryProductRefresh }: CartProps = {}) {
  const { darkMode } = useTheme();
  const context: CartContextValue = useCart();
  const items: CartItemRowItem[] = useMemo(() => context.items, [context.items]);
  const [draftQuantities, setDraftQuantities] = useState<Record<number, string>>({});
  const [quantityErrors, setQuantityErrors] = useState<Record<number, string>>({});
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setDraftQuantities((currentDrafts) => {
      const nextDrafts: Record<number, string> = {};
      items.forEach((item) => {
        nextDrafts[item.productId] = currentDrafts[item.productId] ?? String(item.quantity);
      });
      return nextDrafts;
    });
    setQuantityErrors((currentErrors) => {
      const nextErrors: Record<number, string> = {};
      items.forEach((item) => {
        if (currentErrors[item.productId]) {
          nextErrors[item.productId] = currentErrors[item.productId];
        }
      });
      return nextErrors;
    });
  }, [items]);

  const appliedCoupon = context.couponCode;
  const subtotalCents = context.subtotal;
  const discountCents = context.couponDiscount;
  const shippingCents = context.shipping;
  const grandTotalCents = context.grandTotal;

  const setDraftQuantity = (productId: number, value: string) => {
    setDraftQuantities((currentDrafts) => ({ ...currentDrafts, [productId]: value }));
    setQuantityErrors((currentErrors) => {
      if (!currentErrors[productId]) {
        return currentErrors;
      }
      const nextErrors = { ...currentErrors };
      delete nextErrors[productId];
      return nextErrors;
    });
  };

  const commitQuantity = (productId: number, value = draftQuantities[productId] ?? '') => {
    const quantity = parseQuantity(value);
    if (quantity === null) {
      setQuantityErrors((currentErrors) => ({ ...currentErrors, [productId]: QUANTITY_ERROR }));
      setAnnouncement(QUANTITY_ERROR);
      return false;
    }

    context.updateQuantity(productId, quantity);
    setDraftQuantities((currentDrafts) => ({ ...currentDrafts, [productId]: String(quantity) }));
    setQuantityErrors((currentErrors) => {
      if (!currentErrors[productId]) {
        return currentErrors;
      }
      const nextErrors = { ...currentErrors };
      delete nextErrors[productId];
      return nextErrors;
    });
    setAnnouncement(`Quantity for ${items.find((item) => item.productId === productId)?.name ?? 'item'} updated.`);
    return true;
  };

  const adjustQuantity = (productId: number, change: number) => {
    const item = items.find((candidate) => candidate.productId === productId);
    if (!item) {
      return;
    }

    const draftQuantity = parseQuantity(draftQuantities[productId] ?? '');
    const currentQuantity = draftQuantity ?? item.quantity;
    const nextQuantity = currentQuantity + change;
    if (nextQuantity <= 0) {
      context.removeItem(productId);
      setAnnouncement(`${item.name} removed from your cart.`);
      return;
    }

    commitQuantity(productId, String(nextQuantity));
  };

  const removeCartItem = (productId: number) => {
    const item = items.find((candidate) => candidate.productId === productId);
    context.removeItem(productId);
    if (item) {
      setAnnouncement(`${item.name} removed from your cart.`);
    }
  };

  const updateCart = () => {
    let hasInvalidQuantity = false;
    items.forEach((item) => {
      if (!commitQuantity(item.productId)) {
        hasInvalidQuantity = true;
      }
    });
    if (!hasInvalidQuantity) {
      setAnnouncement('Cart updated.');
    }
  };

  const applyCoupon = (code: string) => {
    context.applyCoupon(code);
  };

  const hasError = Boolean(productRefreshError);

  return (
    <div className={`min-h-screen overflow-x-hidden px-4 pb-16 pt-20 transition-colors duration-300 ${darkMode ? 'bg-dark' : 'bg-gray-100'}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Order review</p>
            <h1 className={`mt-1 text-3xl font-bold transition-colors duration-300 ${darkMode ? 'text-light' : 'text-gray-800'}`}>Shopping Cart</h1>
          </div>
          {items.length > 0 && (
            <p className={`text-right text-sm transition-colors duration-300 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {items.reduce((total, item) => total + item.quantity, 0)} items
            </p>
          )}
        </div>

        {isLoading && items.length === 0 ? (
          <LoadingState />
        ) : items.length === 0 && hasError ? (
          <RefreshError message={errorMessage(productRefreshError)} onRetry={onRetryProductRefresh} />
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {hasError && (
              <div className="mb-6">
                <RefreshError message={errorMessage(productRefreshError)} onRetry={onRetryProductRefresh} />
              </div>
            )}
            {isLoading && (
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300" role="status">Refreshing product details...</p>
            )}
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
              <section aria-labelledby="cart-items-heading" className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
                <h2 id="cart-items-heading" className="sr-only">Cart items</h2>
                <div className="hidden min-w-0 xl:block">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <caption className="sr-only">Items in your shopping cart</caption>
                    <colgroup>
                      <col className="w-[8%]" />
                      <col className="w-[20%]" />
                      <col className="w-[25%]" />
                      <col className="w-[13%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead className="bg-gray-100 text-gray-800 dark:bg-gray-900/70 dark:text-light">
                      <tr>
                        <th scope="col" className="px-2 py-4 text-center font-bold">S. No.</th>
                        <th scope="col" className="px-2 py-4 text-center font-bold">Product Image</th>
                        <th scope="col" className="px-3 py-4 text-left font-bold">Product Name</th>
                        <th scope="col" className="px-2 py-4 text-center font-bold">Unit Price</th>
                        <th scope="col" className="px-2 py-4 text-center font-bold">Quantity</th>
                        <th scope="col" className="px-2 py-4 text-center font-bold">Total</th>
                        <th scope="col" className="px-2 py-4 text-center font-bold">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <CartItemRow
                          key={item.productId}
                          item={item}
                          index={index + 1}
                          variant="table"
                          draftQuantity={draftQuantities[item.productId] ?? String(item.quantity)}
                          quantityError={quantityErrors[item.productId]}
                          onDraftQuantityChange={setDraftQuantity}
                          onCommitQuantity={commitQuantity}
                          onAdjustQuantity={adjustQuantity}
                          onRemove={removeCartItem}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 p-4 xl:hidden">
                  {items.map((item, index) => (
                    <CartItemRow
                      key={item.productId}
                      item={item}
                      index={index + 1}
                      variant="card"
                      draftQuantity={draftQuantities[item.productId] ?? String(item.quantity)}
                      quantityError={quantityErrors[item.productId]}
                      onDraftQuantityChange={setDraftQuantity}
                      onCommitQuantity={commitQuantity}
                      onAdjustQuantity={adjustQuantity}
                      onRemove={removeCartItem}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-4 border-t border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
                  <CouponForm appliedCoupon={appliedCoupon} onApply={applyCoupon} />
                  <button
                    type="button"
                    onClick={updateCart}
                    className="min-h-[40px] shrink-0 rounded-md bg-primary px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                  >
                    Update Cart
                  </button>
                </div>
              </section>

              <OrderSummary
                subtotalCents={subtotalCents}
                discountCents={discountCents}
                shippingCents={shippingCents}
                grandTotalCents={grandTotalCents}
                appliedCoupon={appliedCoupon}
              />
            </div>
          </>
        )}
        <p className="sr-only" aria-live="polite">{announcement}</p>
      </div>
    </div>
  );
}