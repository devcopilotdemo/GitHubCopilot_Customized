import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../../context/CartContext';
import { useTheme } from '../../../context/ThemeContext';

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

export default function Cart() {
  const {
    cart,
    isLoading,
    error,
    updateCart,
    isUpdating,
    updateError,
    removeItem,
    isRemoving,
    removeError,
  } = useCart();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [couponCode, setCouponCode] = useState('');

  useEffect(() => {
    if (cart) {
      setQuantities(Object.fromEntries(cart.items.map(item => [item.productId, item.quantity])));
      setCouponCode(cart.totals.couponCode ?? '');
    }
  }, [cart]);

  const handleQuantityChange = (productId: number, quantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.min(99, Math.max(1, quantity)),
    }));
  };

  const handleUpdateCart = async () => {
    const items = Object.entries(quantities).map(([productId, quantity]) => ({
      productId: Number(productId),
      quantity,
    }));

    try {
      await updateCart({
        items,
        couponCode: couponCode.trim() || null,
      });
    } catch {
      return;
    }
  };

  const handleCouponSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await updateCart({ couponCode: couponCode.trim() || null });
    } catch {
      return;
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-red-500 text-center" role="alert">{error}</div>
        </div>
      </div>
    );
  }

  const cartItems = cart?.items ?? [];
  const totals = cart?.totals ?? {
    subtotal: 0,
    couponDiscount: 0,
    shipping: 0,
    grandTotal: 0,
  };
  const actionError = updateError ?? removeError;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} transition-colors duration-300`}>Shopping Cart</h1>

          {actionError && (
            <div className="rounded-lg bg-red-100 px-4 py-3 text-red-700" role="alert">
              {actionError}
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className={`${darkMode ? 'bg-gray-800 text-light' : 'bg-white text-gray-800'} rounded-lg p-8 text-center shadow-lg transition-colors duration-300`}>
              <h2 className="text-2xl font-semibold mb-3">Your cart is empty</h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                Add smart cat tech products to prepare a demo checkout.
              </p>
              <Link
                to="/products"
                className="inline-flex items-center rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-accent"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg lg:col-span-2 transition-colors duration-300`}>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-light' : 'text-gray-700'}`}>Product</th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-light' : 'text-gray-700'}`}>Price</th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-light' : 'text-gray-700'}`}>Quantity</th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${darkMode ? 'text-light' : 'text-gray-700'}`}>Total</th>
                        <th className="px-4 py-3"><span className="sr-only">Remove</span></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {cartItems.map(item => (
                        <tr key={item.productId}>
                          <td className="px-4 py-4">
                            <div className="flex min-w-[14rem] items-center gap-4">
                              <img src={`/${item.imgName}`} alt={item.name} className="h-20 w-20 rounded-lg object-contain" />
                              <div>
                                <div className={`font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>{item.name}</div>
                                <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>{item.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-4 ${darkMode ? 'text-light' : 'text-gray-800'}`}>
                            {item.discount ? (
                              <div>
                                <span className="mr-2 text-sm text-gray-500 line-through">{formatCurrency(item.originalPrice)}</span>
                                <span>{formatCurrency(item.unitPrice)}</span>
                              </div>
                            ) : (
                              formatCurrency(item.unitPrice)
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className={`inline-flex items-center rounded-lg p-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.productId, (quantities[item.productId] ?? item.quantity) - 1)}
                                className={`h-8 w-8 ${darkMode ? 'text-light' : 'text-gray-700'} hover:text-primary`}
                                aria-label={`Decrease quantity of ${item.name}`}
                              >
                                -
                              </button>
                              <input
                                id={`cart-qty-${item.productId}`}
                                type="number"
                                min="1"
                                max="99"
                                value={quantities[item.productId] ?? item.quantity}
                                onChange={event => handleQuantityChange(item.productId, Number(event.target.value))}
                                className={`h-8 w-14 rounded border text-center ${darkMode ? 'bg-gray-800 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                                aria-label={`Quantity of ${item.name}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(item.productId, (quantities[item.productId] ?? item.quantity) + 1)}
                                className={`h-8 w-8 ${darkMode ? 'text-light' : 'text-gray-700'} hover:text-primary`}
                                aria-label={`Increase quantity of ${item.name}`}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className={`px-4 py-4 font-semibold ${darkMode ? 'text-light' : 'text-gray-800'}`}>{formatCurrency(item.lineTotal)}</td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                void removeItem(item.productId).catch(() => undefined);
                              }}
                              disabled={isRemoving}
                              className="text-sm font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                              aria-label={`Remove ${item.name} from cart`}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 border-t border-gray-200 p-4 md:flex-row md:items-end md:justify-between">
                  <form onSubmit={event => void handleCouponSubmit(event)} className="flex flex-col gap-2 sm:flex-row">
                    <div>
                      <label htmlFor="coupon-code" className={`mb-1 block text-sm font-medium ${darkMode ? 'text-light' : 'text-gray-700'}`}>
                        Coupon code
                      </label>
                      <input
                        id="coupon-code"
                        value={couponCode}
                        onChange={event => setCouponCode(event.target.value)}
                        placeholder="SAVE5"
                        className={`rounded-lg border px-3 py-2 ${darkMode ? 'bg-gray-700 text-light border-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="self-end rounded-lg bg-gray-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                    >
                      Apply Coupon
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => void handleUpdateCart()}
                    disabled={isUpdating}
                    className="rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {isUpdating ? 'Updating...' : 'Update Cart'}
                  </button>
                </div>
              </section>

              <aside className={`${darkMode ? 'bg-gray-800 text-light' : 'bg-white text-gray-800'} rounded-lg p-6 shadow-lg transition-colors duration-300`}>
                <h2 className="mb-4 text-2xl font-semibold">Order Summary</h2>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd>{formatCurrency(totals.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Coupon discount</dt>
                    <dd>-{formatCurrency(totals.couponDiscount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Shipping</dt>
                    <dd>{formatCurrency(totals.shipping)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-3 text-xl font-bold">
                    <dt>Total</dt>
                    <dd>{formatCurrency(totals.grandTotal)}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => navigate('/checkout')}
                  className="mt-6 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-accent"
                >
                  Proceed To Checkout
                </button>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
