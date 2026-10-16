import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import currencyFormat from '@/lib/currencyFormat';
import { formatPrice } from '@/lib/price';
import { AddToCart } from '@/components/cart/add-to-cart';
import { ProductGallery } from '@/components/product/product-gallery';
import { ProductDetailsTabs } from '@/components/product/product-details-tabs';
import { ProductVariantSelector } from '@/components/product/product-variant-selector';
import CatalogBreadcrumbs from '@/components/catalog/catalog-breadcrumbs';
import Link from 'next/link';

type ProductPageProps = {
    params: Promise<{ slug: string }>;
};

type ProductCharacteristic = {
    id: string;
    name: string;
    value: string;
};

function getDocumentHref(documentUrl: string) {
    if (documentUrl.startsWith('http://') || documentUrl.startsWith('https://')) {
        return documentUrl;
    }

    if (documentUrl.startsWith('/')) {
        return documentUrl;
    }

    return `/pdf/${documentUrl}`;
}

function formatNumericValue(value: unknown) {
    return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 4 });
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params;

    if (!slug) {
        notFound();
    }

    const product = await prisma.product.findUnique({
        where: { slug, status: 'ACTIVE' },
        select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            price: true,
            priceOld: true,
            currency: true,
            availability: true,
            stockQty: true,
            leadTimeDays: true,
            minOrderQty: true,
            stepQty: true,
            weightKg: true,
            widthMm: true,
            heightMm: true,
            depthMm: true,
            operatingTempFromC: true,
            operatingTempToC: true,
            unitMeasure: {
                select: {
                    shortName: true,
                },
            },
            imageUrl: true,
            category: {
                select: {
                    name: true,
                    slug: true,
                },
            },
            images: {
                select: {
                    id: true,
                    url: true,
                    altText: true,
                    isPrimary: true,
                    sortOrder: true,
                },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
            },
            specs: {
                select: {
                    id: true,
                    name: true,
                    value: true,
                    unit: true,
                },
            },
            attributeValues: {
                where: {
                    attribute: {
                        isFilterable: true,
                    },
                },
                select: {
                    id: true,
                    textValue: true,
                    numberValue: true,
                    booleanValue: true,
                    attribute: {
                        select: {
                            name: true,
                            unit: true,
                            sortOrder: true,
                        },
                    },
                },
                orderBy: [{ attribute: { sortOrder: 'asc' } }, { id: 'asc' }],
            },
            variantGroup: {
                select: {
                    attributeId: true,
                    attribute: {
                        select: {
                            name: true,
                            unit: true,
                        },
                    },
                    products: {
                        where: {
                            status: 'ACTIVE',
                            isSellable: true,
                        },
                        select: {
                            id: true,
                            slug: true,
                            availability: true,
                            stockQty: true,
                            attributeValues: {
                                select: {
                                    attributeId: true,
                                    textValue: true,
                                    numberValue: true,
                                    booleanValue: true,
                                },
                            },
                        },
                    },
                },
            },
            documents: {
                select: {
                    id: true,
                    title: true,
                    url: true,
                },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
        },
    });

    if (!product) {
        notFound();
    }

    const price = Number(product.price);
    const priceOld = product.priceOld != null ? Number(product.priceOld) : null;
    const isProductInStock = product.availability === 'IN_STOCK' && product.stockQty > 0;
    const unitLabel = product.unitMeasure.shortName;
    const priceSuffix = `${currencyFormat(product.currency as 'RUB' | 'USD' | 'EUR')} / ${unitLabel}`;
    const stockLabel = isProductInStock
        ? `${product.stockQty} ${unitLabel}`
        : product.availability === 'BACKORDER'
          ? `Под заказ${product.leadTimeDays ? `, ориентировочно ${product.leadTimeDays} дн.` : ''}`
          : 'Нет в наличии';
    const galleryImages = [
        ...(product.imageUrl
            ? [
                  {
                      id: 'main',
                      url: product.imageUrl,
                      altText: product.name,
                  },
              ]
            : []),
        ...product.images
            .filter((image) => image.url !== product.imageUrl)
            .map((image) => ({
                id: image.id,
                url: image.url,
                altText: image.altText ?? product.name,
            })),
    ];
    const primaryCharacteristics: ProductCharacteristic[] = [
        ...product.attributeValues.flatMap((item) => {
            const rawValue =
                item.numberValue !== null
                    ? formatNumericValue(item.numberValue)
                    : item.textValue
                      ? item.textValue
                      : item.booleanValue !== null
                        ? item.booleanValue
                            ? 'Да'
                            : 'Нет'
                        : null;

            return rawValue
                ? [
                      {
                          id: `attribute-${item.id}`,
                          name: item.attribute.name,
                          value: `${rawValue}${item.attribute.unit ? ` ${item.attribute.unit}` : ''}`,
                      },
                  ]
                : [];
        }),
        product.operatingTempFromC !== null
            ? {
                  id: 'temperature-from',
                  name: 'Минимальная рабочая температура',
                  value: `${product.operatingTempFromC} °C`,
              }
            : null,
        product.operatingTempToC !== null
            ? {
                  id: 'temperature-to',
                  name: 'Максимальная рабочая температура',
                  value: `${product.operatingTempToC} °C`,
              }
            : null,
    ].filter((item): item is ProductCharacteristic => item !== null);
    const additionalCharacteristics: ProductCharacteristic[] = [
        product.weightKg !== null
            ? { id: 'weight', name: 'Масса', value: `${formatNumericValue(product.weightKg)} кг` }
            : null,
        product.widthMm !== null
            ? { id: 'width', name: 'Ширина', value: `${formatNumericValue(product.widthMm)} мм` }
            : null,
        product.heightMm !== null
            ? { id: 'height', name: 'Высота', value: `${formatNumericValue(product.heightMm)} мм` }
            : null,
        product.depthMm !== null
            ? { id: 'depth', name: 'Глубина', value: `${formatNumericValue(product.depthMm)} мм` }
            : null,
    ].filter((item): item is ProductCharacteristic => item !== null);
    const otherCharacteristics = product.specs.map((spec) => ({
        id: `spec-${spec.id}`,
        name: spec.name,
        value: `${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`,
    }));
    const previewCharacteristics = [
        ...primaryCharacteristics,
        ...additionalCharacteristics,
        ...otherCharacteristics,
    ].slice(0, 4);
    const productVariants = product.variantGroup
        ? product.variantGroup.products.flatMap((variant) => {
              const attributeValue = variant.attributeValues.find(
                  (value) => value.attributeId === product.variantGroup?.attributeId,
              );
              const rawValue =
                  attributeValue?.numberValue !== null && attributeValue?.numberValue !== undefined
                      ? formatNumericValue(attributeValue.numberValue)
                      : attributeValue?.textValue
                        ? attributeValue.textValue
                        : attributeValue?.booleanValue !== null &&
                            attributeValue?.booleanValue !== undefined
                          ? attributeValue.booleanValue
                              ? 'Да'
                              : 'Нет'
                          : null;

              return rawValue
                  ? [
                        {
                            id: variant.id,
                            slug: variant.slug,
                            availability: variant.availability,
                            stockQty: variant.stockQty,
                            value: rawValue,
                            numericValue:
                                attributeValue?.numberValue !== null &&
                                attributeValue?.numberValue !== undefined
                                    ? Number(attributeValue.numberValue)
                                    : null,
                        },
                    ]
                  : [];
          })
        : [];

    return (
        <>
            <CatalogBreadcrumbs category={product.category} productName={product.name} />
            <section className="relative w-screen py-12">
                <div className="relative container mx-auto space-y-12 px-5">
                    <div className="space-y-3">
                        <h1 className=" text-black leading-[110%]">{product.name}</h1>
                    </div>
                    <div className="grid items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <ProductGallery images={galleryImages} productName={product.name} />

                        <div className="space-y-5">
                            {product.variantGroup ? (
                                <ProductVariantSelector
                                    attributeName={product.variantGroup.attribute.name}
                                    unit={product.variantGroup.attribute.unit}
                                    currentProductId={product.id}
                                    variants={productVariants}
                                />
                            ) : null}
                            <h2 className="text-black">Основные характеристики</h2>
                            {previewCharacteristics.length ? (
                                <dl>
                                    {previewCharacteristics.map((characteristic) => (
                                        <div
                                            key={characteristic.id}
                                            className="flex items-end gap-2 py-2"
                                        >
                                            <dt className="font-medium text-black">
                                                {characteristic.name}:
                                            </dt>
                                            <dd className="shrink-0 text-right font-medium text-black">
                                                {characteristic.value}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            ) : (
                                <p className="text-dark-grey">Характеристики не указаны</p>
                            )}
                            <Link
                                href="#characteristics"
                                className="inline-flex font-medium text-black underline underline-offset-4"
                            >
                                Все характеристики
                            </Link>
                        </div>

                        <div className="flex h-full flex-col justify-between gap-7 md:col-span-2 lg:col-span-1 border border-accent rounded-2xl p-6">
                            <div className="space-y-5">
                                <div className="flex flex-col items-baseline gap-2">
                                    {product.priceOld != null && (
                                        <span className="text-base lg:text-lg leading-[100%] text-dark-grey line-through">
                                            {formatPrice(priceOld ?? 0)} {priceSuffix}
                                        </span>
                                    )}
                                    <span className="price">
                                        {formatPrice(price)} {priceSuffix}
                                    </span>
                                </div>
                                <p className="text-dark-grey">Артикул: {product.sku}</p>
                            </div>
                            <div className="space-y-5">
                                <p className="text-dark-grey">Наличие товара: {stockLabel}</p>
                                <AddToCart
                                    product={{
                                        id: product.id,
                                        slug,
                                        name: product.name,
                                        sku: product.sku,
                                        price,
                                        currency: product.currency as 'RUB' | 'USD' | 'EUR',
                                        imageUrl: product.imageUrl,
                                        unitShortName: unitLabel,
                                        minOrderQty: product.minOrderQty,
                                        stepQty: product.stepQty,
                                        availability: product.availability,
                                        leadTimeDays: product.leadTimeDays,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <ProductDetailsTabs
                        description={product.description}
                        primaryCharacteristics={primaryCharacteristics}
                        additionalCharacteristics={additionalCharacteristics}
                        otherCharacteristics={otherCharacteristics}
                        documents={product.documents.map((document) => ({
                            id: document.id,
                            title: document.title,
                            href: getDocumentHref(document.url),
                        }))}
                    />
                </div>
            </section>
        </>
    );
}
