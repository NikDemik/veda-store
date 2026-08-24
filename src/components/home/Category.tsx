import Image from 'next/image';
import Link from 'next/link';

import ArrowIcon from '@/components/svg/arrow-icon';
import { popularCategories } from '@/data/home/popularCategories';

export default function Category() {
    return (
        <section className="relative z-30 -mt-54.5 xl:-mt-84.5 w-screen">
            <div className="relative container px-5 mx-auto">
                <h2 className="section-title uppercase mb-8">Популярные серии</h2>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {popularCategories.map((category) => (
                        <Link
                            key={category.title.join(' ')}
                            href={category.href}
                            aria-label={category.imageAlt}
                            className=" relative w-full p-8 rounded-xl max-sm:aspect-400/220 xl:aspect-694/440 bg-white/55 backdrop-blur dark:bg-black/55 shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            <div className="absolute z-0 top-[20%] right-[14%] w-[50%] sm:w-[20%] xl:w-[52%] 2xl:top-[10%] 2xl:left-[24%] 2xl:w-[72%] aspect-397/254 pointer-events-none">
                                <Image
                                    src={category.image}
                                    fill
                                    quality={75}
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    alt={category.imageAlt}
                                    className="object-contain object-center"
                                />
                            </div>
                            <div className="relative z-50 flex h-full flex-col justify-between">
                                <h3 className="text-dark-accent mb-7">
                                    {category.title.map((titleLine, index) => (
                                        <span key={titleLine}>
                                            {index > 0 ? <br /> : null}
                                            {titleLine}
                                        </span>
                                    ))}
                                </h3>
                                <div className=" flex justify-between items-center">
                                    <ul className=" text-black font-medium list-inside list-disc">
                                        {category.items.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                    <div>
                                        <ArrowIcon size={55} color="var(--accent)" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
