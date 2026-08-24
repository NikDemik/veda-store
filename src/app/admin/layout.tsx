import { AdminFooter } from '@/components/admin/admin-footer';
import { AdminHeader } from '@/components/admin/admin-header';
import { getCurrentStaffUser } from '@/lib/admin-auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const staffUser = await getCurrentStaffUser();

    return (
        <div className="flex min-h-screen w-full flex-col bg-slate-50 font-inter text-black">
            <AdminHeader staffUser={staffUser} />
            <main className="flex-1 w-full">{children}</main>
            <AdminFooter />
        </div>
    );
}
