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
        <section className="relative w-screen h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] lg:h-[calc(100vh-20rem)]">
            <div
                className="absolute inset-0 z-10 bg-[#f3f3f3] dark:bg-[#222222] overflow-hidden"
                aria-hidden="true"
            >
                {/* <Image
                    src="/img/bg-hero-anneng.png"
                    fill
                    priority
                    quality={75}
                    sizes="100vw"
                    className="pointer-events-none object-cover object-center"
                    alt="Фоновое изображение для главного баннера"
                    loading="eager"
                /> */}
            </div>

            <div ref={emblaRef} className="relative z-20 h-full overflow-hidden">
                <div className="flex h-full">
                    {heroSlides.map((slide, index) => (
                        <div key={slide.image} className="relative h-full min-w-0 flex-[0_0_100%]">
                            <div className="relative container mx-auto h-full px-5">
                                <h1 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-[3.125rem] mt-28 mb-4 uppercase md:max-w-[46vw] text-black dark:text-white">
                                    {slide.title} {slide.breakBeforeAccent ? <br /> : null}
                                    <span className="text-accent">{slide.accent}</span>
                                </h1>
                                {slide.description.map((text, descriptionIndex) => (
                                    <p
                                        key={text}
                                        className={
                                            descriptionIndex === slide.description.length - 1
                                                ? 'mb-10 text-base text-black dark:text-white md:max-w-[50vw] xl:max-w-175'
                                                : 'text-base text-black dark:text-white md:max-w-[48vw] xl:max-w-175'
                                        }
                                    >
                                        {text}
                                    </p>
                                ))}
                                <div className="flex flex-col gap-2 md:w-66 xl:flex-row xl:gap-5">
                                    <Button
                                        asChild
                                        className="w-full"
                                        variant={'default'}
                                        size={'default'}
                                    >
                                        <Link href={menuData[0]?.href ?? '/catalog'}>
                                            Каталог оборудования
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        className="w-full"
                                        variant={'outline'}
                                        size={'default'}
                                    >
                                        <Link href={menuData[3]?.href ?? '/contacts'}>
                                            Запросить подбор
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="pointer-events-none absolute top-1/3 right-0 z-10 hidden aspect-2000/1400 w-[min(40vw,46rem)] -translate-y-1/2 md:block">
                                <Image
                                    src={slide.image}
                                    fill
                                    priority={index === 0}
                                    quality={100}
                                    sizes="(max-width: 1536px) 40vw, 46rem"
                                    className="object-contain object-center"
                                    alt={slide.imageAlt}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-[50%] z-50">
                <div className="mx-auto flex justify-between gap-2 px-5">
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
