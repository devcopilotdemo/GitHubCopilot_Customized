import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';

interface CartRenderOptions {
  initialEntries?: string[];
}

export function renderWithCart(
  ui: ReactElement,
  { initialEntries = ['/'] }: CartRenderOptions = {},
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <CartProvider>{ui}</CartProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}