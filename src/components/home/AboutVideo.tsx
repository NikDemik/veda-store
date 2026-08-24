'use client';

import Image from 'next/image';
import VideoPlayer from '@/components/video/VideoPlayer';

export default function AboutVideo() {
    return (
        <section className="relative w-screen">
            <div className="relative z-10 container mx-auto px-5 flex flex-col xl:flex-row justify-center xl:items-center gap-6 md:gap-8 lg:gap-10 xl:gap-12 w-full">
                <div className="flex flex-col gap-2 md:gap-3 lg:gap-4 xl:max-w-140 w-fit">
                    <h2 className="section-title text-black">
                        Производство шинопровода ANNENG ELECTRIC
                    </h2>
                    <p className="text-lg bg-linear-to-r from-accent to-white dark:to-black rounded-sm">
                        Обзор производства
                    </p>
                    <p>
                        Компания Anneng производит системы передачи энергии по индивидуальным
                        заказам для различных областей применения. Шинопровод производства Anneng
                        используется, для подвесных и удлиненных рельсовых путей для кранов,
                        монорельсов, электрических подъемников, электротолкателей, систем
                        штабелирования, портовых машин, а также для многих других устройств,
                        обеспечивающих питание движущихся силовых агрегатов. Компактность,
                        устойчивость к коррозии и простота монтажа — основные преимущества этой
                        системы.
                    </p>
                </div>
                <div className="flex-1 w-full">
                    <VideoPlayer
                        src="https://storage.yandexcloud.net/website-image-catalogs/videos/proizvodstvo-shinoprovoda-anneng-electric.mp4"
                        className="rounded-2xl shadow-2xl"
                        poster="/logo/logo-anneng-white-video.png"
                        aspectRatio="16:9"
                        // autoGeneratePoster={true}
                        // posterTime={2} // Захватить кадр на 2-й секунде
                        onPlay={() => console.log('Video started')}
                        onPause={() => console.log('Video paused')}
                        onEnded={() => console.log('Video ended')}
                        onError={(error) => console.error('Video error:', error)}
                    />
                </div>
            </div>
        </section>
    );
}
