import Footer from '@/components/base/footer';
import Header from '@/components/base/header';
// import SiteBreadcrumbs from '@/components/base/site-breadcrumbs';
import ScrollToTop from '@/components/ui/scroll-to-top';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-between overflow-hidden bg-white font-inter dark:bg-black">
            <Header />
            {/* <SiteBreadcrumbs /> */}
            <main className="bg-white dark:bg-black sm:items-start">
                {children}
                <ScrollToTop />
            </main>
            <Footer />
        </div>
    );
}
