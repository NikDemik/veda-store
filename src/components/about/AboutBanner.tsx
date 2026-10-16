'use client';

import Image from 'next/image';

export default function AboutBanner() {
    return (
        <section className=" relative py-15 lg:py-30 px-16 lg:px-34 overflow-hidden rounded-[8px]">
            {/* Фоновое изображение */}
            <Image
                src="/img/about-banner-bg.png"
                alt="Background"
                fill
                className="object-cover"
                priority
                quality={75}
            />
            <div className="mx-auto backdrop-blur-[20px] bg-white/10 rounded-[8px] py-16 lg:py-40 px-12 lg:px-25.5 ">
                <h1 className="text-2xl lg:text-4xl font-bold leading-tight tracking-wide text-white mb-10 uppercase">
                    Мы помогаем подобрать решения под задачи объекта и обеспечиваем техническую
                    поддержку на всех этапах.
                </h1>

                <div className="text-base md:text-lg leading-none lg:leading-relaxed text-white max-w-3xl">
                    <p>
                        {/* <strong className="text-accent font-bold">ООО «Альпарк» </strong> */}
                        ООО «Альпарк» — компания, специализирующаяся на поставках грузоподъёмного и
                        электротехнического
                        <br />
                        оборудования VEDA VFD для промышленности, логистики
                        <br />и строительства.
                    </p>
                </div>
            </div>
        </section>
    );
}
