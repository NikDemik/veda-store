import ContactsForm from '@/components/contacts/ContactsForm';
import Image from 'next/image';

export default function ContactsSection() {
    return (
        <section className=" relative bg-dark-accent overflow-hidden">
            <div className=" relative container mx-auto space-y-8 px-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-5">
                    <div className="flex flex-col justify-between gap-5 max-lg:pt-10 lg:py-20 lg:pl-5">
                        <div>
                            <h2 className="section-title section-title--white uppercase mb-4">
                                Получить консультацию
                            </h2>
                            <h3 className=" lg:text-xl font-bold leading-[140%] text-grey pr-5">
                                Хотите узнать, какие наши решения могут помочь вам оптимизировать
                                процессы?
                            </h3>
                        </div>
                        <p className=" lg:text-xl font-bold leading-[140%] text-grey">
                            Оставьте заявку — мы свяжемся с вами в рабочее время.
                        </p>
                    </div>
                    {/* Форма обратной связи */}
                    <div className="flex flex-col justify-between gap-5 max-w-135 max-lg:pb-10 lg:py-20 lg:mr-5">
                        <ContactsForm />
                    </div>
                </div>
            </div>
            {/* <div className="hidden lg:block absolute top-0 left-[50%] ">
                <Image
                    src="/img/contacts-form-bg.png"
                    width={1123}
                    height={747}
                    quality={75}
                    className=" min-h-145  object-cover"
                    alt="Изорбражение контактной формы"
                />
            </div> */}
        </section>
    );
}
