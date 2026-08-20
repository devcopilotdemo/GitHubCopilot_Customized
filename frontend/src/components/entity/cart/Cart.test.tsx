import { useEffect, useRef } from 'react';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../App';
import Cart from './Cart';
import { useCart, type Product } from '../../../context/CartContext';
import { renderWithCart } from '../../../test/testUtils';

const fixtureProduct: Product = {
  productId: 12,
  name: 'Interactive Laser Toy',
  price: 20,
  imgName: 'laser-toy.png',
  discount: 0.25,
};

const axiosGet = vi.spyOn(axios, 'get');

const productResponse = (data: unknown[]) => ({
  data,
} as Awaited<ReturnType<typeof axios.get>>);

function renderAppWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  axiosGet.mockReset();
});

function SeededCart({ couponCode }: { couponCode?: string }) {
  const { addItem, applyCoupon } = useCart();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) {
      return;
    }

    seeded.current = true;
    addItem(fixtureProduct, 2);
    if (couponCode) {
      applyCoupon(couponCode);
    }
  }, [addItem, applyCoupon, couponCode]);

  return <Cart />;
}

describe('Cart presentation', () => {
  it('renders the empty state with a products link', () => {
    renderWithCart(<Cart />);

    expect(screen.getByRole('heading', { name: 'Shopping Cart' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse Products' }).getAttribute('href')).toBe(
      '/products',
    );
  });

  it('renders item details, quantity controls, coupon discount, shipping, total, and disabled checkout', async () => {
    const user = userEvent.setup();
    renderWithCart(<SeededCart couponCode="SAVE5" />);

    expect(await screen.findByRole('heading', { name: fixtureProduct.name })).toBeTruthy();
    const quantityInputs = screen.getAllByRole('textbox', { name: `Quantity of ${fixtureProduct.name}` });
    expect(quantityInputs).toHaveLength(2);
    expect(quantityInputs.map((input) => input.id)).toEqual([
      `cart-quantity-table-${fixtureProduct.productId}`,
      `cart-quantity-card-${fixtureProduct.productId}`,
    ]);
    expect(screen.getAllByRole('button', { name: `Increase quantity of ${fixtureProduct.name}` })).toHaveLength(2);

    const summary = screen.getByRole('complementary', { name: 'Order Summary' });
    expect(within(summary).getByText('Discount (5%)')).toBeTruthy();
    expect(within(summary).getByText('$30.00')).toBeTruthy();
    expect(within(summary).getByText('$10.00')).toBeTruthy();
    expect(within(summary).getByText('$38.50')).toBeTruthy();

    const checkoutButton = within(summary).getByRole('button', { name: 'Proceed To Checkout' });
    expect((checkoutButton as HTMLButtonElement).disabled).toBe(true);

    const quantityInput = quantityInputs[0];
    await user.click(screen.getAllByRole('button', {
      name: `Increase quantity of ${fixtureProduct.name}`,
    })[0]);

    expect((quantityInput as HTMLInputElement).value).toBe('3');
    expect(within(summary).getByText('$45.00')).toBeTruthy();
    expect(within(summary).getByText('$52.75')).toBeTruthy();
  });

  it('renders the coupon discount with a currency symbol', async () => {
    renderWithCart(<SeededCart couponCode="SAVE5" />);

    await screen.findByRole('heading', { name: fixtureProduct.name });
    const summary = screen.getByRole('complementary', { name: 'Order Summary' });

    expect(within(summary).getByText('-$1.50')).toBeTruthy();
  });

  it('shows coupon success and error feedback', async () => {
    const user = userEvent.setup();
    renderWithCart(<SeededCart />);

    await screen.findByRole('heading', { name: fixtureProduct.name });
    const couponInput = screen.getByRole('textbox', { name: 'Coupon code' });
    await user.type(couponInput, ' sAvE5 ');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));

    expect((await screen.findByRole('status')).textContent).toContain(
      'Coupon applied: 5% off your subtotal.',
    );

    const summary = screen.getByRole('complementary', { name: 'Order Summary' });
    expect(within(summary).getByText('Discount (5%)')).toBeTruthy();

    await user.clear(couponInput);
    await user.type(couponInput, 'NOPE');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Enter a valid coupon code.');
    expect(couponInput.getAttribute('aria-invalid')).toBe('true');
  });

  it('preserves the cart quantity and exposes an accessible error for invalid direct input', async () => {
    const user = userEvent.setup();
    renderWithCart(<SeededCart />);

    await screen.findByRole('heading', { name: fixtureProduct.name });
    const quantityInput = screen.getAllByRole('textbox', {
      name: `Quantity of ${fixtureProduct.name}`,
    })[0];
    await user.clear(quantityInput);
    await user.type(quantityInput, '1.5');
    await user.tab();

    expect((quantityInput as HTMLInputElement).value).toBe('1.5');
    expect(quantityInput.getAttribute('aria-invalid')).toBe('true');
    expect(quantityInput.getAttribute('aria-describedby')).toBe(
      `cart-quantity-table-${fixtureProduct.productId}-error`,
    );
    expect(screen.getAllByRole('textbox', {
      name: `Quantity of ${fixtureProduct.name}`,
    })[1].getAttribute('aria-describedby')).toBe(
      `cart-quantity-card-${fixtureProduct.productId}-error`,
    );
    expect(screen.getAllByText('Enter a whole number greater than zero.').length).toBeGreaterThan(0);
    expect(screen.getByText('2 items')).toBeTruthy();
  });
});

describe('App cart route', () => {
  it('renders the cart route with its providers', () => {
    window.history.pushState({}, '', '/cart');
    axiosGet.mockResolvedValue(productResponse([]));

    renderAppWithQueryClient();

    expect(screen.getByRole('heading', { name: 'Shopping Cart' })).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('keeps saved items visible when refresh fails and retries the product query', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('octocat-cart-v1', JSON.stringify({
      version: 1,
      items: [{
        productId: fixtureProduct.productId,
        name: fixtureProduct.name,
        imgName: fixtureProduct.imgName,
        unitPriceCents: 1500,
        quantity: 2,
      }],
      couponCode: null,
    }));
    window.history.pushState({}, '', '/cart');
    axiosGet
      .mockRejectedValueOnce(new Error('Product service unavailable'))
      .mockResolvedValueOnce(productResponse([]));

    renderAppWithQueryClient();

    expect((await screen.findByRole('alert')).textContent).toContain('Product service unavailable');
    expect(screen.getByRole('heading', { name: fixtureProduct.name })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(axiosGet).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('heading', { name: fixtureProduct.name })).toBeTruthy();
  });
});