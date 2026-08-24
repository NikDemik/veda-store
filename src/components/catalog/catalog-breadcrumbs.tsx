import Link from 'next/link';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type CatalogBreadcrumbsProps = {
    category: {
        name: string;
        slug: string;
    };
    productName?: string;
};

export default function CatalogBreadcrumbs({ category, productName }: CatalogBreadcrumbsProps) {
    return (
        <div className="w-screen bg-white dark:bg-black">
            <div className="container mx-auto px-5 pt-5">
                <Breadcrumb>
                    <BreadcrumbList className="gap-1.5 text-sm text-dark-grey sm:gap-1.5">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild className="text-dark-grey hover:text-accent">
                                <Link href="/">Главная</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        <BreadcrumbSeparator className="text-dark-grey">/</BreadcrumbSeparator>

                        <BreadcrumbItem>
                            <BreadcrumbLink asChild className="text-dark-grey hover:text-accent">
                                <Link href="/catalog">Каталог</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        <BreadcrumbSeparator className="text-dark-grey">/</BreadcrumbSeparator>

                        <BreadcrumbItem>
                            {productName ? (
                                <BreadcrumbLink asChild className="text-dark-grey hover:text-accent">
                                    <Link href={`/catalog/${category.slug}`}>{category.name}</Link>
                                </BreadcrumbLink>
                            ) : (
                                <BreadcrumbPage className="text-accent">
                                    {category.name}
                                </BreadcrumbPage>
                            )}
                        </BreadcrumbItem>

                        {productName ? (
                            <>
                                <BreadcrumbSeparator className="text-dark-grey">
                                    /
                                </BreadcrumbSeparator>
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-accent">
                                        {productName}
                                    </BreadcrumbPage>
                                </BreadcrumbItem>
                            </>
                        ) : null}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </div>
    );
}
