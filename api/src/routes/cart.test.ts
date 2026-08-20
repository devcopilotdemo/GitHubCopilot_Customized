import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cartRouter, { resetCart } from './cart';
import { Cart } from '../models/cart';

let app: express.Express;

describe('Cart API', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/cart', cartRouter);
    resetCart();
  });

  it('should return an empty cart', async () => {
    const response = await request(app).get('/cart');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [],
      totals: {
        subtotal: 0,
        couponDiscount: 0,
        shipping: 0,
        grandTotal: 0,
      },
    });
  });

  it('should add items and merge repeated product additions', async () => {
    await request(app).post('/cart/items').send({ productId: 1, quantity: 1 }).expect(201);
    const response = await request(app).post('/cart/items').send({ productId: 1, quantity: 2 });
    const cart = response.body as Cart;

    expect(response.status).toBe(201);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      productId: 1,
      quantity: 3,
      originalPrice: 129.99,
      discount: 0.25,
      unitPrice: 97.49,
      lineTotal: 292.47,
    });
    expect(cart.totals).toEqual({
      subtotal: 292.47,
      couponDiscount: 0,
      shipping: 10,
      grandTotal: 302.47,
    });
  });

  it('should update quantities and apply the SAVE5 coupon with exact totals', async () => {
    await request(app).post('/cart/items').send({ productId: 1, quantity: 1 }).expect(201);
    await request(app).post('/cart/items').send({ productId: 3, quantity: 1 }).expect(201);

    const response = await request(app).put('/cart').send({
      items: [
        { productId: 1, quantity: 2 },
        { productId: 3, quantity: 1 },
      ],
      couponCode: 'SAVE5',
    });

    expect(response.status).toBe(200);
    expect((response.body as Cart).totals).toEqual({
      subtotal: 284.97,
      couponCode: 'SAVE5',
      couponDiscount: 14.25,
      shipping: 10,
      grandTotal: 280.72,
    });
  });

  it('should remove items and clear coupon from an empty cart', async () => {
    await request(app).post('/cart/items').send({ productId: 3, quantity: 1 }).expect(201);
    await request(app).put('/cart').send({ couponCode: 'SAVE5' }).expect(200);

    const response = await request(app).delete('/cart/items/3');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      items: [],
      totals: {
        subtotal: 0,
        couponDiscount: 0,
        shipping: 0,
        grandTotal: 0,
      },
    });
  });

  it('should reject invalid products, quantities, IDs, and coupons without mutating state', async () => {
    await request(app).post('/cart/items').send({ productId: 3, quantity: 1 }).expect(201);
    const before = await request(app).get('/cart');

    await request(app).post('/cart/items').send({ productId: 999, quantity: 1 }).expect(400);
    await request(app).post('/cart/items').send({ productId: 3, quantity: 0 }).expect(400);
    await request(app).post('/cart/items').send({ productId: 3, quantity: 100 }).expect(400);
    await request(app).put('/cart').send({ couponCode: 'BOGUS' }).expect(400);
    await request(app).delete('/cart/items/not-a-number').expect(400);

    const after = await request(app).get('/cart');
    expect(after.body).toEqual(before.body);
  });
});
