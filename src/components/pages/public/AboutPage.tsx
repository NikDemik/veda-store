import AboutBanner from '@/components/about/AboutBanner';
import AboutCard from '@/components/about/AboutCard';

export default function About() {
    return (
        <section className="relative w-screen py-12">
            <div className="relative container mx-auto space-y-8 px-5">
                <AboutBanner />
                <AboutCard />
            </div>
        </section>
    );
}
