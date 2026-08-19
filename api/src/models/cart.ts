/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       required:
 *         - productId
 *         - name
 *         - sku
 *         - unit
 *         - imgName
 *         - quantity
 *         - originalPrice
 *         - unitPrice
 *         - lineTotal
 *       properties:
 *         productId:
 *           type: integer
 *         name:
 *           type: string
 *         sku:
 *           type: string
 *         unit:
 *           type: string
 *         imgName:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 99
 *         originalPrice:
 *           type: number
 *           format: float
 *           description: Catalog price before product discount.
 *         discount:
 *           type: number
 *           format: float
 *           description: Product discount as a decimal, when present.
 *         unitPrice:
 *           type: number
 *           format: float
 *           description: Effective unit price, price * (1 - discount), rounded to cents.
 *         lineTotal:
 *           type: number
 *           format: float
 *     CartTotals:
 *       type: object
 *       required:
 *         - subtotal
 *         - couponDiscount
 *         - shipping
 *         - grandTotal
 *       properties:
 *         subtotal:
 *           type: number
 *           format: float
 *         couponCode:
 *           type: string
 *           nullable: true
 *           description: SAVE5 applies a 5% subtotal discount; blank or null removes the coupon.
 *         couponDiscount:
 *           type: number
 *           format: float
 *           description: Reference calculation with SAVE5 on $267 subtotal is -$13.35.
 *         shipping:
 *           type: number
 *           format: float
 *           description: $10 for non-empty carts and $0 for empty carts.
 *         grandTotal:
 *           type: number
 *           format: float
 *           description: Reference total for $267 subtotal, -$13.35 discount, and $10 shipping is $263.65.
 *     Cart:
 *       type: object
 *       required:
 *         - items
 *         - totals
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         totals:
 *           $ref: '#/components/schemas/CartTotals'
 *     AddCartItemRequest:
 *       type: object
 *       required:
 *         - productId
 *         - quantity
 *       properties:
 *         productId:
 *           type: integer
 *         quantity:
 *           type: integer
 *           minimum: 1
 *           maximum: 99
 *     UpdateCartRequest:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 99
 *         couponCode:
 *           type: string
 *           nullable: true
 *           description: SAVE5 applies 5%; blank or null removes the coupon.
 */
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

export interface CartQuantityUpdate {
  productId: number;
  quantity: number;
}

export interface AddCartItemRequest extends CartQuantityUpdate {}

export interface UpdateCartRequest {
  items?: CartQuantityUpdate[];
  couponCode?: string | null;
}
