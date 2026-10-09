'use client';

import { useEffect, useRef, useState } from 'react';

export type Product = {
  id?: number | string;
  name?: string;
  price?: number;
  stockTotal?: number;
};

type CartItem = {
  productId: number | string;
  name: string;
  price: number;
  orderCount: number;
  totalPrice: number;
  stock?: number;
};

export default function ProductList({ products }: { products: Product[] }) {

  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [messageVisible, setMessageVisible] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
      if (messageClearTimer.current) clearTimeout(messageClearTimer.current);
    };
  }, []);

  function addToCart(product: Product) {
    if (product.id === undefined) return;

    const productKey = String(product.id);
    const stock = product.stockTotal ?? 0;
    const orderCount = Math.max(1, orderCounts[productKey] ?? 1);
    const name = product.name ?? 'ไม่ระบุชื่อสินค้า';
    const price = product.price ?? 0;

    const savedCart = localStorage.getItem('cart');
    let currentCart: CartItem[] = [];

    try {
      currentCart = savedCart ? (JSON.parse(savedCart) as CartItem[]) : [];
    } catch {
      localStorage.removeItem('cart');
    }

    //เช็คสินค้าว่าทีในตะกร้าหรือยัง
    const existingItem = currentCart.find(
      (item) => String(item.productId) === productKey,
    );
    //เช็คจำนวนเดิมในตะกร้า กับจำนวนที่เพิ่มเข้ามาต้องไม่เกิน stock
    const nextCount = Math.min(
      stock,
      (existingItem?.orderCount ?? 0) + orderCount,
    );
    const nextCart = existingItem
      ? currentCart.map((item) =>
          String(item.productId) === productKey
            ? {
                ...item,
                name,
                price,
                orderCount: nextCount,
                totalPrice: price * nextCount,
                stock: stock
              }
            : item,
        )
      : [
          ...currentCart,
          {
            productId: product.id,
            name,
            price,
            orderCount: nextCount,
            totalPrice: price * nextCount,
            stock: stock
          },
        ];

    localStorage.setItem('cart', JSON.stringify(nextCart));

    setMessage(`เพิ่ม ${name} ลงตะกร้าแล้ว`);
    setMessageVisible(true);
    // clear timeout ออกเมื่อกดมาใหม่
    if (messageTimer.current) clearTimeout(messageTimer.current);
    if (messageClearTimer.current) clearTimeout(messageClearTimer.current);

    messageTimer.current = setTimeout(() => {
      setMessageVisible(false);
      messageTimer.current = null;
      messageClearTimer.current = setTimeout(() => {
        setMessage('');
        messageClearTimer.current = null;
      }, 300);
    }, 1700);
  }

  return (
    <>
      {message && (
        <p
          className={`absolute mt-2 place-self-center rounded-xl border px-4 py-2 text-green-700 transition-opacity duration-300 ${
            messageVisible ? 'opacity-100' : 'opacity-0'
          }`}
          aria-live="polite"
        >
          {message}
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-10">
        {products.map((product, index) => {
          const stock = product.stockTotal ?? 0;
          const productKey = String(product.id ?? index);

          return (
            <div key={productKey} className="rounded-xl border p-8">
              <div className="text-3xl">{product.name ?? 'ไม่ระบุชื่อสินค้า'}</div>
              <div className="text-lg mt-4">ราคา {product.price} บาท</div>
              <div className="flex items-center justify-between text-md mt-16">
                <div>คงเหลือ {stock} ชิ้น</div>
                <div>
                  <input
                    className="mr-2 w-16 rounded-sm border text-center p-1"
                    type="number"
                    min="1"
                    max={stock}
                    value={orderCounts[productKey] ?? 1}
                    onChange={(event) =>
                      setOrderCounts((current) => ({
                        ...current,
                        [productKey]: Number(event.target.value),
                      }))
                    }
                    disabled={stock <= 0 || product.id === undefined}
                  />
                  <button
                    className="rounded-xl border bg-black px-4 py-2 text-white disabled:bg-gray-400"
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={stock <= 0 || product.id === undefined}
                  >
                    เพิ่มลงตะกร้า
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
