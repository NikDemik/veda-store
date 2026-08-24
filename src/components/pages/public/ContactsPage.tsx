import ContactsAndMap from '@/components/contacts/ContactsAndMap';
import ContactsSection from '@/components/contacts/ContactsSection';

export default function Contacts() {
    return (
        <div className="relative w-screen pt-12">
            <ContactsAndMap />
            <ContactsSection />
        </div>
    );
}
