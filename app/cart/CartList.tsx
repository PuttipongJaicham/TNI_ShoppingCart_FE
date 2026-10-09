'use client';

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

type CartItem = {
  productId: number | string;
  name: string;
  price: number;
  orderCount: number;
  totalPrice: number;
  stock?: number;
};

const EMPTY_CART = '[]';

function getCartSnapshot() {
  return localStorage.getItem('cart') ?? EMPTY_CART;
}

function getServerCartSnapshot() {
  return EMPTY_CART;
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('cart-updated', callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('cart-updated', callback);
  };
}

function readCart(value: string): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem('cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
}

export default function CartList() {
  const router = useRouter();
  const cartValue = useSyncExternalStore(
    subscribe,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const cart = useMemo(() => readCart(cartValue), [cartValue]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateCount(productId: number | string, requestedCount: number) {
    const item = cart.find((cartItem) => cartItem.productId === productId);
    if (!item) return;

    const maxCount = item.stock ?? Number.MAX_SAFE_INTEGER;
    const orderCount = Math.max(1, Math.min(maxCount, requestedCount));

    saveCart(
      cart.map((cartItem) =>
        cartItem.productId === productId
          ? {
              ...cartItem,
              orderCount,
              totalPrice: cartItem.price * orderCount,
            }
          : cartItem,
      ),
    );
  }

  function removeItem(productId: number | string) {
    saveCart(cart.filter((item) => item.productId !== productId));
  }

  function removeAllItems() {
    saveCart([]);
  }

  async function confirmPayment() {
    setIsProcessing(true);

    try {
      const requestBody = cart.map((item) => ({
        productId: Number(item.productId),
        orderCount: item.orderCount,
      }));
      const response = await fetch('http://localhost:5277/UpdateStock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('อัปเดต Stock ไม่สำเร็จ');

      const responseBody: unknown = await response.json();
      const isSuccess =
        responseBody === true ||
        responseBody === 'true' ||
        (typeof responseBody === 'object' &&
          responseBody !== null &&
          'success' in responseBody &&
          responseBody.success === true);

      if (!isSuccess) throw new Error('API แจ้งว่าการชำระเงินไม่สำเร็จ');

      setIsCheckoutOpen(false);
      saveCart([]);
      setResultMessage('การสั่งซื้อสำเร็จ');
      redirectTimer.current = setTimeout(() => router.push('/product'), 2000);
    } catch {
      setIsCheckoutOpen(false);
      setResultMessage('การสั่งซื้อไม่สำเร็จ');
    } finally {
      setIsProcessing(false);
    }
  }

  const totalPrice = cart.reduce((total, item) => total + item.totalPrice, 0);

  if (cart.length === 0 && !resultMessage) {
    return <p>ยังไม่มีสินค้าในตะกร้า</p>;
  }

  return (
    <>
      <div className=' text-right'>
        <button
          className="rounded-xl border bg-red-500 px-4 py-2 text-white"
          type="button"
          onClick={removeAllItems}
        >
          ล้างรายการทั้งหมด
        </button>
      </div>
      <div className="grid grid-cols-12 gap-4 border-b pb-2 font-semibold">
        <div className="col-span-5">สินค้า</div>
        <div className="col-span-2 text-right">ราคา/ชิ้น</div>
        <div className="col-span-2 text-center">จำนวน</div>
        <div className="col-span-2 text-right">ราคารวม</div>
        <div />
      </div>

      {cart.map((item) => (
        <div
          key={item.productId}
          className="my-2 grid grid-cols-12 items-center gap-4 rounded-md bg-[#eeeeee96]"
        >
          <div className="col-span-5 p-5">{item.name}</div>
          <div className="col-span-2 text-right">{item.price.toLocaleString()} บาท</div>
          <div className="col-span-2 flex items-center justify-center gap-2">
            <button
              className="rounded-full border px-2"
              type="button"
              onClick={() => updateCount(item.productId, item.orderCount - 1)}
              disabled={item.orderCount <= 1}
            >
              −
            </button>
            <input
              className="w-14 rounded border p-1 text-center"
              type="number"
              min="1"
              max={item.stock}
              value={item.orderCount}
              onChange={(event) =>
                updateCount(item.productId, Number(event.target.value))
              }
            />
            <button
              className="rounded-full border px-2"
              type="button"
              onClick={() => updateCount(item.productId, item.orderCount + 1)}
              disabled={item.stock !== undefined && item.orderCount >= item.stock}
            >
              +
            </button>
          </div>
          <div className="col-span-2 text-right">
            {item.totalPrice.toLocaleString()} บาท
          </div>
          <div className="text-center">
            <button
              className="rounded-xl border bg-red-500 px-4 py-2 text-white"
              type="button"
              onClick={() => removeItem(item.productId)}
            >
              ลบ
            </button>
          </div>
        </div>
      ))}

      <div className="mt-6 flex justify-end border-t pt-4 text-xl font-bold">
        รวมทั้งหมด: {totalPrice.toLocaleString()} บาท
      </div>
      
      <div className=' text-right'>
        <button
          className="rounded-xl border mt-4 bg-blue-500 px-6 py-2 text-white"
          type="button"
          onClick={() => setIsCheckoutOpen(true)}
        >
          ชำระเงิน
        </button>
      </div>

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">ยืนยันการชำระเงิน</h2>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between border-b pb-2">
                  <span>{item.name} x {item.orderCount}</span>
                  <span>{item.totalPrice.toLocaleString()} บาท</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right text-xl font-bold">
              รวมทั้งหมด: {totalPrice.toLocaleString()} บาท
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-xl border px-4 py-2"
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                disabled={isProcessing}
              >
                ยกเลิก
              </button>
              <button
                className="rounded-xl bg-green-600 px-4 py-2 text-white disabled:bg-gray-400"
                type="button"
                onClick={confirmPayment}
                disabled={isProcessing}
              >
                {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยันการชำระเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resultMessage && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl bg-white p-8 text-center shadow-xl">
            <p className={resultMessage === 'การสั่งซื้อสำเร็จ' ? 'text-green-600' : 'text-red-600'}>
              {resultMessage}
            </p>
              <button
                className="mt-4 rounded-xl border px-4 py-2"
                type="button"
                onClick={() => setResultMessage('')}
              >
                ปิด
              </button>
          </div>
        </div>
      )}
    </>
  );
}
