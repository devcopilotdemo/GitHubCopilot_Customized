/* eslint-disable react-refresh/only-export-components */
import { createContext, ReactNode, useContext } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { api } from '../api/config';

export interface CartItem {
  productId: number;
  name: string;
  sku: string;
  unit: string;
  imgName: string;
  quantity: number;
  originalPrice: number;
  discount?: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartTotals {
  subtotal: number;
  couponCode?: string;
  couponDiscount: number;
  shipping: number;
  grandTotal: number;
}

export interface Cart {
  items: CartItem[];
  totals: CartTotals;
}

interface AddCartItemPayload {
  productId: number;
  quantity: number;
}

interface UpdateCartPayload {
  items?: AddCartItemPayload[];
  couponCode?: string | null;
}

interface CartContextType {
  cart: Cart | undefined;
  itemCount: number;
  isLoading: boolean;
  error: string | null;
  isAdding: boolean;
  addError: string | null;
  addItem: (payload: AddCartItemPayload) => Promise<Cart>;
  isUpdating: boolean;
  updateError: string | null;
  updateCart: (payload: UpdateCartPayload) => Promise<Cart>;
  isRemoving: boolean;
  removeError: string | null;
  removeItem: (productId: number) => Promise<Cart>;
}

const CartContext = createContext<CartContextType | null>(null);
const cartQueryKey = 'cart';

const getCart = async (): Promise<Cart> => {
  const { data } = await axios.get<Cart>(`${api.baseURL}${api.endpoints.cart}`);
  return data;
};

const addCartItem = async (payload: AddCartItemPayload): Promise<Cart> => {
  const { data } = await axios.post<Cart>(`${api.baseURL}${api.endpoints.cartItems}`, payload);
  return data;
};

const updateCartRequest = async (payload: UpdateCartPayload): Promise<Cart> => {
  const { data } = await axios.put<Cart>(`${api.baseURL}${api.endpoints.cart}`, payload);
  return data;
};

const removeCartItem = async (productId: number): Promise<Cart> => {
  const { data } = await axios.delete<Cart>(`${api.baseURL}${api.endpoints.cartItems}/${productId}`);
  return data;
};

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? 'Cart request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Cart request failed';
};

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const cartQuery = useQuery<Cart, unknown>(cartQueryKey, getCart);

  const addMutation = useMutation<Cart, unknown, AddCartItemPayload>(addCartItem, {
    onSuccess: cart => {
      queryClient.setQueryData(cartQueryKey, cart);
    },
  });

  const updateMutation = useMutation<Cart, unknown, UpdateCartPayload>(updateCartRequest, {
    onSuccess: cart => {
      queryClient.setQueryData(cartQueryKey, cart);
    },
  });

  const removeMutation = useMutation<Cart, unknown, number>(removeCartItem, {
    onSuccess: cart => {
      queryClient.setQueryData(cartQueryKey, cart);
    },
  });

  const itemCount = cartQuery.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart: cartQuery.data,
        itemCount,
        isLoading: cartQuery.isLoading,
        error: cartQuery.error ? getErrorMessage(cartQuery.error) : null,
        isAdding: addMutation.isLoading,
        addError: addMutation.error ? getErrorMessage(addMutation.error) : null,
        addItem: addMutation.mutateAsync,
        isUpdating: updateMutation.isLoading,
        updateError: updateMutation.error ? getErrorMessage(updateMutation.error) : null,
        updateCart: updateMutation.mutateAsync,
        isRemoving: removeMutation.isLoading,
        removeError: removeMutation.error ? getErrorMessage(removeMutation.error) : null,
        removeItem: removeMutation.mutateAsync,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
