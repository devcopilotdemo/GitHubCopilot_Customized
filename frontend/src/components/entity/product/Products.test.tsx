import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from 'react-query';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { Cart, CartProvider } from '../../../context/CartContext';
import { ThemeProvider } from '../../../context/ThemeContext';
import Products from './Products';

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
}

const mockedAxios = axios as unknown as MockedAxios;

const emptyCart: Cart = {
  items: [],
  totals: {
    subtotal: 0,
    couponDiscount: 0,
    shipping: 0,
    grandTotal: 0,
  },
};

const cartWithItem: Cart = {
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

const renderProducts = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  mockedAxios.get.mockImplementation((url: string) => {
    if (url.endsWith('/api/products')) {
      return Promise.resolve({
        data: [
          {
            productId: 3,
            supplierId: 2,
            name: 'CatFlix Entertainment Portal',
            description: 'On-demand laser shows',
            price: 89.99,
            sku: 'CAT-FLIX-001',
            unit: 'piece',
            imgName: 'catflix.png',
          },
        ],
      });
    }

    return Promise.resolve({ data: emptyCart });
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CartProvider>
          <Products />
        </CartProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('Products cart integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a selected quantity through the cart API and resets quantity after success', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ data: cartWithItem });
    renderProducts();

    expect(await screen.findByText('CatFlix Entertainment Portal')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Increase quantity of CatFlix Entertainment Portal'));
    expect(screen.getByLabelText('Quantity of CatFlix Entertainment Portal')).toHaveTextContent('1');

    await user.click(screen.getByRole('button', { name: 'Add 1 CatFlix Entertainment Portal to cart' }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(expect.stringContaining('/api/cart/items'), {
        productId: 3,
        quantity: 1,
      });
    });
    expect(screen.getByLabelText('Quantity of CatFlix Entertainment Portal')).toHaveTextContent('0');
  });
});
