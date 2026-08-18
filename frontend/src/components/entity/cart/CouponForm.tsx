import { useEffect, useState } from 'react';

interface CouponFormProps {
  appliedCoupon?: string | null;
  onApply: (code: string) => void;
}

export default function CouponForm({ appliedCoupon, onApply }: CouponFormProps) {
  const [code, setCode] = useState(appliedCoupon ?? '');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (appliedCoupon) {
      setCode(appliedCoupon);
    }
  }, [appliedCoupon]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.trim().toUpperCase() !== 'SAVE5') {
      setIsError(true);
      setMessage('Enter a valid coupon code.');
      return;
    }

    onApply('SAVE5');
    setIsError(false);
    setMessage('Coupon applied: 5% off your subtotal.');
  };

  return (
    <form onSubmit={handleSubmit} className="min-w-0 flex-1" noValidate>
      <label htmlFor="cart-coupon" className="sr-only">Coupon code</label>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <input
          id="cart-coupon"
          type="text"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            if (message) {
              setMessage('');
              setIsError(false);
            }
          }}
          placeholder="Coupon Code"
          autoComplete="off"
          aria-invalid={isError ? 'true' : 'false'}
          aria-describedby={message ? 'cart-coupon-message' : undefined}
          className="min-h-[40px] min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-100 px-3 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-900 dark:text-light dark:placeholder:text-gray-500"
        />
        <button
          type="submit"
          className="min-h-[40px] rounded-md bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
        >
          Apply Coupon
        </button>
      </div>
      {message && (
        <p id="cart-coupon-message" role={isError ? 'alert' : 'status'} className={`mt-2 text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
          {message}
        </p>
      )}
    </form>
  );
}