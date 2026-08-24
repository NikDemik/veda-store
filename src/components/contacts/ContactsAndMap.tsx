'use client';

import contactData from '@/data/contactData';
import dynamic from 'next/dynamic';

// Динамический импорт — отключаем SSR для карты
const DynamicMapIframe = dynamic(() => import('@/components/contacts/MapIframe'), { ssr: false });

export default function ContactsAndMap() {
    return (
        <section className="relative container mx-auto space-y-8 px-5 mb-20">
            <h2 className="section-title mb-8 uppercase">Контакты</h2>
            <div className="grid grid-cols-1 gap-5 lg:gap-0 lg:grid-cols-2">
                {/* Блок с контактными данными */}
                <div className=" space-y-6 max-w-135">
                    <div>
                        <h3 className=" text-dark-grey mb-4">Телефон:</h3>
                        <p className="font-medium">{contactData.phone}</p>
                        <p className="font-medium">{contactData.phone2}</p>
                    </div>
                    <div>
                        <h3 className=" text-dark-grey mb-4">Электронная почта:</h3>
                        <p className="font-medium">{contactData.email}</p>
                    </div>
                    <div>
                        <h3 className=" text-dark-grey mb-4">Адрес офиса:</h3>
                        <p className="font-medium">{contactData.address}</p>
                    </div>
                    <div>
                        <h3 className=" text-dark-grey mb-4">Часы работы:</h3>
                        <p className="font-medium">{contactData.workingHours}</p>
                    </div>
                </div>
                {/* Яндекс карта*/}
                <div className="min-h-100 lg:min-h-auto">
                    <DynamicMapIframe src={contactData.mapEmbedUrl} />
                </div>
            </div>
        </section>
    );
}
