import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ThemeProvider } from '../../../context/ThemeContext';
import { CartProvider, Cart as CartContract } from '../../../context/CartContext';
import Cart from './Cart';
import Navigation from '../../Navigation';
import { AuthProvider } from '../../../context/AuthContext';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn((error: unknown) => typeof error === 'object' && error !== null && 'response' in error),
  },
}));

interface MockedAxios {
  get: Mock;
  post: Mock;
  put: Mock;
  delete: Mock;
}

const mockedAxios = axios as unknown as MockedAxios;

const emptyCart: CartContract = {
  items: [],
  totals: {
    subtotal: 0,
    couponDiscount: 0,
    shipping: 0,
    grandTotal: 0,
  },
};

const cartWithItem: CartContract = {
  items: [
    {
      productId: 3,
      name: 'CatFlix Entertainment Portal',
      sku: 'CAT-FLIX-001',
      unit: 'piece',
      imgName: 'catflix.png',
      quantity: 1,
      originalPrice: 89.99,
      unitPrice: 89.99,
      lineTotal: 89.99,
    },
  ],
  totals: {
    subtotal: 89.99,
    couponDiscount: 0,
    shipping: 10,
    grandTotal: 99.99,
  },
};

const updatedCart: CartContract = {
  items: [
    {
      ...cartWithItem.items[0],
      quantity: 2,
      lineTotal: 179.98,
    },
  ],
  totals: {
    subtotal: 179.98,
    couponDiscount: 9,
    couponCode: 'SAVE5',
    shipping: 10,
    grandTotal: 180.98,
  },
};

const renderCart = (initialCart: CartContract) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  mockedAxios.get.mockResolvedValue({ data: initialCart });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <MemoryRouter initialEntries={['/cart']}>
              <Navigation />
              <Routes>
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<div>Checkout Handoff</div>} />
                <Route path="/products" element={<div>Products page</div>} />
              </Routes>
            </MemoryRouter>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('Cart page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state and navigation badge count', async () => {
    renderCart(emptyCart);

    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByLabelText('Shopping cart with 0 items')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue Shopping' })).toHaveAttribute('href', '/products');
  });

  it('updates quantities, applies coupons, removes items, and navigates to checkout', async () => {
    const user = userEvent.setup();
    mockedAxios.put.mockResolvedValue({ data: updatedCart });
    mockedAxios.delete.mockResolvedValue({ data: emptyCart });
    renderCart(cartWithItem);

    expect(await screen.findByText('CatFlix Entertainment Portal')).toBeInTheDocument();
    expect(screen.getByLabelText('Shopping cart with 1 items')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Increase quantity of CatFlix Entertainment Portal'));
    await user.clear(screen.getByLabelText('Coupon code'));
    await user.type(screen.getByLabelText('Coupon code'), 'SAVE5');
    await user.click(screen.getByRole('button', { name: 'Update Cart' }));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(expect.stringContaining('/api/cart'), {
        items: [{ productId: 3, quantity: 2 }],
        couponCode: 'SAVE5',
      });
    });

    await user.click(screen.getByRole('button', { name: 'Proceed To Checkout' }));
    expect(await screen.findByText('Checkout Handoff')).toBeInTheDocument();

    await user.click(screen.getAllByRole('link', { name: 'Cart' })[0]);
    await user.click(await screen.findByRole('button', { name: 'Remove CatFlix Entertainment Portal from cart' }));
    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(expect.stringContaining('/api/cart/items/3'));
    });
  });

  it('shows API coupon errors', async () => {
    const user = userEvent.setup();
    mockedAxios.put.mockRejectedValue({
      response: {
        data: { error: 'Invalid coupon code' },
      },
    });
    renderCart(cartWithItem);

    await screen.findByText('CatFlix Entertainment Portal');
    await user.clear(screen.getByLabelText('Coupon code'));
    await user.type(screen.getByLabelText('Coupon code'), 'BOGUS');
    await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid coupon code');
  });
});
