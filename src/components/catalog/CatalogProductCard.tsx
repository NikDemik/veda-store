import Link from 'next/link';
import Image from 'next/image';
import { getSafeImageUrl } from '@/lib/imageUrl';
import currencyFormat from '@/lib/currencyFormat';
import { formatCatalogPrice } from '@/lib/price';
import { AddToCartCatalog } from '../cart/add-to-cart-catalog';

export type CatalogProductCardProps = {
    product: {
        id: number;
        sku: string;
        name: string;
        description: string | null;
        slug: string;
        price: unknown;
        priceOld: unknown;
        currency: string;
        availability: 'IN_STOCK' | 'BACKORDER' | 'OUT_OF_STOCK' | 'DISCONTINUED';
        leadTimeDays: number | null;
        minOrderQty: number;
        stepQty: number;
        unitMeasure: { shortName: string };
        imageUrl: string | null;
        currentA: string | null;
        series: { name: string; slug: string } | null;
        numberOfTyres?: string;
    };
};

export default function CatalogProductCard({ product }: CatalogProductCardProps) {
    const price = Number(product.price);
    const priceOld = product.priceOld != null ? Number(product.priceOld) : null;
    const priceSuffix = `${currencyFormat(product.currency as 'RUB' | 'USD' | 'EUR')} / ${
        product.unitMeasure.shortName
    }`;

    return (
        <div className="flex flex-col gap-3 p-3 rounded-xl border border-gray hover:border-accent hover:shadow-shadow-main">
            <Link
                href={`/product/${product.slug}`}
                className="relative block rounded-xl aspect-384/464 overflow-hidden"
            >
                {product.availability === 'BACKORDER' ? (
                    <span className="absolute left-3 top-3 z-10 rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm">
                        Под заказ
                    </span>
                ) : null}
                <Image
                    src={getSafeImageUrl(product.imageUrl)}
                    width={384}
                    height={464}
                    className="p-4 object-contain object-center w-full h-full hover:scale-105 transition-transform duration-300"
                    alt={product.name}
                />
            </Link>

            <div className="flex gap-2 text-dark-accent">
                {product.series && (
                    <span className="px-2 py-1 bg-grey rounded">{product.series.name}</span>
                )}
                {product.currentA && (
                    <span className="px-2 py-1 bg-grey rounded">{product.currentA}A</span>
                )}
                {/* <span className="px-2 py-1 bg-grey rounded">{product.numberOfTyres} шин</span> */}
                {product.numberOfTyres && (
                    <span className="px-2 py-1 bg-grey rounded">{product.numberOfTyres} шин</span>
                )}
            </div>

            <Link href={`/product/${product.slug}`} className="transition flex-1 hover:text-accent">
                <h3
                    className="font-medium tracking-tight leading-4 lg:leading-6 line-clamp-2"
                    title={product.name}
                >
                    {product.name}
                </h3>
            </Link>

            {/* {product.description && <p className="line-clamp-2">{product.description}</p>} */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col mt-2">
                    {priceOld != null && (
                        <span className="text-base lg:text-lg leading-[100%] text-dark-grey line-through">
                            {formatCatalogPrice(priceOld)} {priceSuffix}
                        </span>
                    )}
                    <span className="price">
                        {formatCatalogPrice(price)} {priceSuffix}
                    </span>
                </div>
                <AddToCartCatalog
                    product={{
                        id: product.id,
                        slug: product.slug,
                        name: product.name,
                        sku: product.sku,
                        price,
                        currency: product.currency as 'RUB' | 'USD' | 'EUR',
                        imageUrl: product.imageUrl,
                        unitShortName: product.unitMeasure.shortName,
                        minOrderQty: product.minOrderQty,
                        stepQty: product.stepQty,
                        availability: product.availability,
                        leadTimeDays: product.leadTimeDays,
                    }}
                />
            </div>
        </div>
    );
}
