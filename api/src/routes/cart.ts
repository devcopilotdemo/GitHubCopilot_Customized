/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Demo in-memory shopping cart endpoints
 */

import express, { Request, Response } from 'express';
import { products as seedProducts } from '../seedData';
import { AddCartItemRequest, Cart, CartItem, CartQuantityUpdate, UpdateCartRequest } from '../models/cart';

const router = express.Router();
const MAX_QUANTITY = 99;
const VALID_COUPON = 'SAVE5';

interface ErrorResponse {
  error: string;
}

interface CartEntry {
  productId: number;
  quantity: number;
}

interface ProductIdParams {
  productId: string;
}

let cartEntries: CartEntry[] = [];
let appliedCouponCode: string | undefined;

const roundCurrency = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

const isValidQuantity = (quantity: unknown): quantity is number => (
  typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY
);

const findProduct = (productId: number) => seedProducts.find(product => product.productId === productId);

const isValidProductId = (productId: unknown): productId is number => (
  typeof productId === 'number' && Number.isInteger(productId) && productId > 0
);

const parseProductId = (productId: string) => {
  const parsedProductId = Number(productId);
  return isValidProductId(parsedProductId) ? parsedProductId : undefined;
};

const normalizeCoupon = (couponCode: string | null | undefined) => {
  if (couponCode === undefined) {
    return { couponCode: appliedCouponCode };
  }

  if (couponCode === null || couponCode.trim() === '') {
    return { couponCode: undefined };
  }

  const normalizedCoupon = couponCode.trim().toUpperCase();
  if (normalizedCoupon !== VALID_COUPON) {
    return { error: 'Invalid coupon code' };
  }

  return { couponCode: normalizedCoupon };
};

const toCartItem = ({ productId, quantity }: CartEntry): CartItem | undefined => {
  const product = findProduct(productId);
  if (!product) {
    return undefined;
  }

  const discount = product.discount ?? 0;
  const unitPrice = roundCurrency(product.price * (1 - discount));

  return {
    productId: product.productId,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    imgName: product.imgName,
    quantity,
    originalPrice: product.price,
    ...(product.discount !== undefined ? { discount: product.discount } : {}),
    unitPrice,
    lineTotal: roundCurrency(unitPrice * quantity),
  };
};

const buildCart = (): Cart => {
  const items = cartEntries
    .map(toCartItem)
    .filter((item): item is CartItem => item !== undefined);
  const subtotal = roundCurrency(items.reduce((total, item) => total + item.lineTotal, 0));
  const couponDiscount = appliedCouponCode === VALID_COUPON ? roundCurrency(subtotal * 0.05) : 0;
  const shipping = items.length > 0 ? 10 : 0;

  return {
    items,
    totals: {
      subtotal,
      ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}),
      couponDiscount,
      shipping,
      grandTotal: roundCurrency(subtotal - couponDiscount + shipping),
    },
  };
};

const validateCartQuantityUpdate = (item: CartQuantityUpdate): ErrorResponse | undefined => {
  const productId: unknown = item.productId;
  const quantity: unknown = item.quantity;

  if (!isValidProductId(productId) || !findProduct(productId)) {
    return { error: 'Unknown product' };
  }

  if (!isValidQuantity(quantity)) {
    return { error: `Quantity must be an integer from 1 to ${MAX_QUANTITY}` };
  }

  return undefined;
};

export const resetCart = () => {
  cartEntries = [];
  appliedCouponCode = undefined;
};

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Read the current demo cart
 *     tags: [Cart]
 *     responses:
 *       200:
 *         description: The current cart with server-calculated prices and totals
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *   put:
 *     summary: Batch-update item quantities and coupon
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCartRequest'
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Unknown product, invalid quantity, malformed product ID, or invalid coupon
 * /api/cart/items:
 *   post:
 *     summary: Add a product quantity to the cart, merging with any existing quantity
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddCartItemRequest'
 *     responses:
 *       201:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Unknown product, malformed product ID, or invalid quantity
 * /api/cart/items/{productId}:
 *   delete:
 *     summary: Remove a product from the cart
 *     tags: [Cart]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 *       400:
 *         description: Unknown product or malformed product ID
 */

router.get('/', (_req: Request, res: Response<Cart>) => {
  res.json(buildCart());
});

router.post(
  '/items',
  (req: Request<Record<string, never>, Cart | ErrorResponse, AddCartItemRequest>, res: Response<Cart | ErrorResponse>) => {
    const validationError = validateCartQuantityUpdate(req.body);
    if (validationError) {
      res.status(400).json(validationError);
      return;
    }

    const existingEntry = cartEntries.find(entry => entry.productId === req.body.productId);
    const nextQuantity = (existingEntry?.quantity ?? 0) + req.body.quantity;
    if (nextQuantity > MAX_QUANTITY) {
      res.status(400).json({ error: `Quantity must be an integer from 1 to ${MAX_QUANTITY}` });
      return;
    }

    if (existingEntry) {
      existingEntry.quantity = nextQuantity;
    } else {
      cartEntries.push({ productId: req.body.productId, quantity: req.body.quantity });
    }

    res.status(201).json(buildCart());
  },
);

router.put(
  '/',
  (req: Request<Record<string, never>, Cart | ErrorResponse, UpdateCartRequest>, res: Response<Cart | ErrorResponse>) => {
    const nextEntries = cartEntries.map(entry => ({ ...entry }));

    if (req.body.items !== undefined) {
      if (!Array.isArray(req.body.items)) {
        res.status(400).json({ error: 'Items must be an array' });
        return;
      }

      for (const item of req.body.items) {
        const validationError = validateCartQuantityUpdate(item);
        if (validationError) {
          res.status(400).json(validationError);
          return;
        }
      }

      req.body.items.forEach(item => {
        const existingEntry = nextEntries.find(entry => entry.productId === item.productId);
        if (existingEntry) {
          existingEntry.quantity = item.quantity;
        } else {
          nextEntries.push({ productId: item.productId, quantity: item.quantity });
        }
      });
    }

    const couponResult = normalizeCoupon(req.body.couponCode);
    if (couponResult.error) {
      res.status(400).json({ error: couponResult.error });
      return;
    }

    cartEntries = nextEntries;
    appliedCouponCode = couponResult.couponCode;
    res.json(buildCart());
  },
);

router.delete(
  '/items/:productId',
  (req: Request<ProductIdParams>, res: Response<Cart | ErrorResponse>) => {
    const productId = parseProductId(req.params.productId);
    if (productId === undefined || !findProduct(productId)) {
      res.status(400).json({ error: 'Unknown product' });
      return;
    }

    cartEntries = cartEntries.filter(entry => entry.productId !== productId);
    if (cartEntries.length === 0) {
      appliedCouponCode = undefined;
    }

    res.json(buildCart());
  },
);

export default router;
