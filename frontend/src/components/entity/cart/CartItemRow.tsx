import type { ChangeEvent, KeyboardEvent } from 'react';

export interface CartItemRowItem {
  productId: number;
  name: string;
  imgName: string;
  unitPriceCents: number;
  quantity: number;
}

interface CartItemRowProps {
  item: CartItemRowItem;
  index: number;
  draftQuantity: string;
  quantityError?: string;
  onDraftQuantityChange: (productId: number, value: string) => void;
  onCommitQuantity: (productId: number) => void;
  onAdjustQuantity: (productId: number, change: number) => void;
  onRemove: (productId: number) => void;
  variant?: 'table' | 'card';
}

const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V4h6v3m-9 0 1 13h8l1-13M10 11v5m4-5v5" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function QuantityControl({
  item,
  draftQuantity,
  quantityError,
  onDraftQuantityChange,
  onCommitQuantity,
  onAdjustQuantity,
  variant = 'card',
}: Pick<CartItemRowProps, 'item' | 'draftQuantity' | 'quantityError' | 'onDraftQuantityChange' | 'onCommitQuantity' | 'onAdjustQuantity' | 'variant'>) {
  const inputId = `cart-quantity-${variant}-${item.productId}`;
  const errorId = `${inputId}-error`;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onDraftQuantityChange(item.productId, event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onCommitQuantity(item.productId);
    }
  };

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => onAdjustQuantity(item.productId, -1)}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
          aria-label={`Decrease quantity of ${item.name}`}
        >
          <MinusIcon />
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draftQuantity}
          onChange={handleChange}
          onBlur={() => onCommitQuantity(item.productId)}
          onKeyDown={handleKeyDown}
          className="h-10 w-12 border-0 bg-transparent px-1 text-center font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary dark:text-light"
          aria-label={`Quantity of ${item.name}`}
          aria-invalid={quantityError ? 'true' : 'false'}
          aria-describedby={quantityError ? errorId : undefined}
        />
        <button
          type="button"
          onClick={() => onAdjustQuantity(item.productId, 1)}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-gray-700 transition-colors hover:bg-gray-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900"
          aria-label={`Increase quantity of ${item.name}`}
        >
          <PlusIcon />
        </button>
      </div>
      {quantityError && (
        <p id={errorId} className="max-w-[12rem] text-center text-xs text-red-600 dark:text-red-400">
          {quantityError}
        </p>
      )}
    </div>
  );
}

export default function CartItemRow({
  item,
  index,
  draftQuantity,
  quantityError,
  onDraftQuantityChange,
  onCommitQuantity,
  onAdjustQuantity,
  onRemove,
  variant = 'card',
}: CartItemRowProps) {
  const imageFrame = (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
      <img src={`/${item.imgName}`} alt={`${item.name} product image`} className="h-full w-full object-contain p-2" />
    </div>
  );

  const removeButton = (
    <button
      type="button"
      onClick={() => onRemove(item.productId)}
      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 hover:text-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-800 dark:focus:ring-offset-gray-900"
      aria-label={`Remove ${item.name} from cart`}
    >
      <TrashIcon />
    </button>
  );

  if (variant === 'table') {
    return (
      <tr className="border-t border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/60">
        <th scope="row" className="px-2 py-5 text-center font-semibold text-gray-800 dark:text-light">
          {index}
        </th>
        <td className="px-2 py-5 text-center">{imageFrame}</td>
        <td className="break-words px-3 py-5 font-semibold text-gray-800 dark:text-light">{item.name}</td>
        <td className="px-2 py-5 text-center font-semibold text-gray-800 dark:text-light">{formatCents(item.unitPriceCents)}</td>
        <td className="px-2 py-5">
          <QuantityControl
            item={item}
            draftQuantity={draftQuantity}
            quantityError={quantityError}
            onDraftQuantityChange={onDraftQuantityChange}
            onCommitQuantity={onCommitQuantity}
            onAdjustQuantity={onAdjustQuantity}
            variant={variant}
          />
        </td>
        <td className="px-2 py-5 text-center font-semibold text-gray-800 dark:text-light">{formatCents(item.unitPriceCents * item.quantity)}</td>
        <td className="px-2 py-5 text-center">{removeButton}</td>
      </tr>
    );
  }

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-800">
      <div className="flex min-w-0 items-start gap-3">
        {imageFrame}
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-semibold text-gray-800 dark:text-light">{item.name}</h2>
          <p className="mt-1 text-sm font-semibold text-primary">{formatCents(item.unitPriceCents)} each</p>
        </div>
        {removeButton}
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap items-end justify-between gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <QuantityControl
          item={item}
          draftQuantity={draftQuantity}
          quantityError={quantityError}
          onDraftQuantityChange={onDraftQuantityChange}
          onCommitQuantity={onCommitQuantity}
          onAdjustQuantity={onAdjustQuantity}
          variant={variant}
        />
        <p className="ml-auto text-right text-sm text-gray-600 dark:text-gray-300">
          <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</span>
          <span className="font-semibold text-gray-800 dark:text-light">{formatCents(item.unitPriceCents * item.quantity)}</span>
        </p>
      </div>
    </article>
  );
}