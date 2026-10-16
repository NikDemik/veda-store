import ContactsSection from '@/components/contacts/ContactsSection';
import { ZoomIn, ShoppingBag, PackageCheck, MessagesSquare } from 'lucide-react';
import { serviceCards } from '@/data/services/serviceCards';

// Определяем тип для иконок
const iconComponents = {
    ZoomIn: ZoomIn,
    ShoppingBag: ShoppingBag,
    PackageCheck: PackageCheck,
    MessagesSquare: MessagesSquare,
} as const;

export default function Services() {
    return (
        <div className="relative w-screen pt-12 space-y-20">
            <div className="relative container mx-auto space-y-8 px-5">
                <h1 className=" max-w-265 mb-8 uppercase text-dark-accent">
                    Подбор, поставка и сопровождение промышленного оборудования VEDA VFD
                </h1>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    {serviceCards.map((data) => {
                        const IconComponent = iconComponents[data.iconName];
                        const { style } = data;
                        return (
                            <div
                                key={data.title}
                                className={`flex flex-col justify-between min-h-40 lg:min-h-50 p-6 ${style.card} rounded-[8px]`}
                            >
                                <div className="flex justify-between items-center">
                                    <h2 className={style.text}>{data.title}</h2>
                                    <IconComponent
                                        strokeWidth={1.5}
                                        size={30}
                                        aria-hidden="true"
                                        color={style.icon}
                                    />
                                </div>
                                <p className={`max-w-122 ${style.text}`}>{data.text}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
            <ContactsSection />
        </div>
    );
}
