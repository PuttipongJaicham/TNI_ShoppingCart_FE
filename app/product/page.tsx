import ProductList, { type Product } from './ProductList';

type ProductResponse = Product[];

async function getProducts() {
  const res = await fetch('http://localhost:5277/GetProducts', { cache: 'no-store' });

  if (!res.ok) {
    throw new Error('โหลดข้อมูลไม่สำเร็จ');
  }

  return res.json();
}

async function ProductPage() {
  let data: Product[] = [];

  try {
    data = (await getProducts()) as ProductResponse;
  } catch {
    return (
      <main className="p-8">
        <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
          ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาตรวจสอบว่า Backend กำลังทำงานอยู่ที่
          <span className="ml-1 font-mono">http://localhost:5277</span>
        </p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <ProductList products={data} />
    </main>
  );
}

export default ProductPage
