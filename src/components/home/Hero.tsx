'use client';

import { useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import menuData from '@/data/menuData';
import { heroSlides } from '@/data/home/heroSlides';

import { Button } from '../ui/button';

export default function Hero() {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 35 });

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;

        const autoplay = window.setInterval(() => {
            emblaApi.scrollNext();
        }, 6000);

        return () => window.clearInterval(autoplay);
    }, [emblaApi]);

    return (
        <section className="relative w-full overflow-hidden bg-[#f3f3f3] dark:bg-[#181826]" aria-label="Серии преобразователей частоты VEDA">
            <div ref={emblaRef} className="relative overflow-hidden">
                <div className="flex items-stretch">
                    {heroSlides.map((slide, index) => (
                        <div key={slide.image} className="relative isolate min-w-0 flex-[0_0_100%]">
                            <Image
                                src={slide.background}
                                alt=""
                                fill
                                priority={index === 0}
                                sizes="100vw"
                                className="-z-20 object-cover object-right opacity-70 dark:opacity-25"
                            />
                            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-[#f3f3f3] via-[#f3f3f3]/85 to-transparent dark:from-[#181826] dark:via-[#181826]/85 dark:to-transparent" />
                            <div className="container relative mx-auto grid min-h-[620px] grid-cols-1 items-center gap-2 px-5 pt-12 pb-24 md:min-h-[580px] md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8 md:pt-16 md:pb-24 lg:min-h-[640px] lg:gap-12">
                                <div className="relative z-10 min-w-0">
                                    <h1 className="mb-5 text-2xl uppercase leading-tight text-black dark:text-white lg:text-3xl xl:text-4xl 2xl:text-[3.125rem]">
                                        {slide.title} {slide.breakBeforeAccent ? <br /> : null}
                                        <span className="text-accent">{slide.accent}</span>
                                    </h1>
                                    {slide.description.map((text, descriptionIndex) => (
                                        <p
                                            key={text}
                                            className={
                                                descriptionIndex === slide.description.length - 1
                                                    ? 'mt-3 mb-7 max-w-xl text-base leading-relaxed text-black/75 dark:text-white/80'
                                                    : 'max-w-xl text-base leading-relaxed text-black/75 dark:text-white/80'
                                            }
                                        >
                                            {text}
                                        </p>
                                    ))}
                                    <div className="flex max-w-xl flex-col gap-3 xl:flex-row">
                                        <Button
                                            asChild
                                            className="w-full xl:w-auto xl:flex-1"
                                            variant={'default'}
                                            size={'default'}
                                        >
                                            <Link href={menuData[0]?.href ?? '/catalog'}>
                                                Каталог оборудования
                                            </Link>
                                        </Button>
                                        <Button
                                            asChild
                                            className="w-full xl:w-auto xl:flex-1"
                                            variant={'outline'}
                                            size={'default'}
                                        >
                                            <Link href={menuData[3]?.href ?? '/contacts'}>
                                                Запросить подбор
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                                <div className="pointer-events-none relative mx-auto h-[260px] w-full max-w-[540px] sm:h-[320px] md:h-[420px] lg:h-[480px]">
                                    <Image
                                        src={slide.image}
                                        fill
                                        priority={index === 0}
                                        quality={75}
                                        sizes="(max-width: 767px) 90vw, (max-width: 1280px) 44vw, 540px"
                                        className="object-contain object-center drop-shadow-[0_24px_24px_rgba(0,20,30,0.18)]"
                                        alt={slide.imageAlt}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30">
                <div className="container mx-auto flex justify-end gap-3 px-5">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="pointer-events-auto rounded-full bg-white/80 backdrop-blur-sm dark:bg-black/50"
                        onClick={scrollPrev}
                        aria-label="Предыдущий слайд"
                    >
                        <ChevronLeft aria-hidden="true" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="pointer-events-auto rounded-full bg-white/80 backdrop-blur-sm dark:bg-black/50"
                        onClick={scrollNext}
                        aria-label="Следующий слайд"
                    >
                        <ChevronRight aria-hidden="true" />
                    </Button>
                </div>
            </div>
        </section>
    );
}
