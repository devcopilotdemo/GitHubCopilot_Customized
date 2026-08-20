interface OrderSummaryProps {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  grandTotalCents: number;
  appliedCoupon?: string | null;
}

const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function OrderSummary({
  subtotalCents,
  discountCents,
  shippingCents,
  grandTotalCents,
  appliedCoupon,
}: OrderSummaryProps) {
  const displayedGrandTotal = Number.isFinite(grandTotalCents)
    ? grandTotalCents
    : subtotalCents - discountCents + shippingCents;

  return (
    <aside aria-labelledby="order-summary-heading" className="min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
      <h2 id="order-summary-heading" className="border-b border-gray-200 px-5 py-5 text-center text-2xl font-bold text-gray-800 dark:border-gray-700 dark:text-light">
        Order Summary
      </h2>
      <dl className="divide-y divide-gray-200 dark:divide-gray-700">
        <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
          <dt className="font-semibold text-gray-700 dark:text-gray-200">Subtotal</dt>
          <dd className="font-semibold text-gray-800 dark:text-light">{formatCents(subtotalCents)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
          <dt className="font-semibold text-gray-700 dark:text-gray-200">
            Discount{appliedCoupon ? ' (5%)' : ''}
          </dt>
          <dd className="font-semibold text-gray-800 dark:text-light">
            {discountCents > 0 ? `-${formatCents(discountCents)}` : formatCents(discountCents)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
          <dt className="font-semibold text-gray-700 dark:text-gray-200">Shipping</dt>
          <dd className="font-semibold text-gray-800 dark:text-light">{formatCents(shippingCents)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-3 text-base">
          <dt className="font-bold text-gray-800 dark:text-light">Grand Total</dt>
          <dd className="font-bold text-gray-800 dark:text-light">{formatCents(displayedGrandTotal)}</dd>
        </div>
      </dl>
      <div className="border-t border-gray-200 p-5 dark:border-gray-700">
        <button
          type="button"
          disabled
          aria-describedby="checkout-unavailable"
          className="min-h-[40px] w-full cursor-not-allowed rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white opacity-60 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
        >
          Proceed To Checkout
        </button>
        <p id="checkout-unavailable" className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          Checkout is unavailable in this demo.
        </p>
      </div>
    </aside>
  );
}