import AboutBanner from '@/components/about/AboutBanner';
import AboutCard from '@/components/about/AboutCard';
import ContactsAndMap from '@/components/contacts/ContactsAndMap';
import ContactsSection from '@/components/contacts/ContactsSection';
import AboutVideo from '@/components/home/AboutVideo';
import Category from '@/components/home/Category';
import ContactsLine from '@/components/home/ContactsLine';
import Hero from '@/components/home/Hero';

export default function Home() {
    return (
        <div>
            <div className="flex flex-col items-center mb-20">
                <Hero />
                {/* <Category /> */}
                <ContactsLine />
            </div>
            <div className="flex flex-col items-center space-y-20">
                <AboutVideo />
                <section className="relative w-screen">
                    <div className="relative container mx-auto space-y-8 px-5">
                        <AboutCard />
                        {/* <AboutBanner /> */}
                    </div>
                </section>
                <div className="relative mx-auto w-screen space-y-20">
                    <ContactsSection />
                    <ContactsAndMap />
                </div>
            </div>
        </div>
    );
}
