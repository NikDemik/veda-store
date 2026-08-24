export function AdminFooter() {
    return (
        <footer className="w-full border-t border-slate-200 bg-white">
            <div className="mx-auto flex w-full flex-col gap-2 px-5 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>Giovenzana admin</p>
                <p>Доступ только для сотрудников с активной учетной записью Администратора.</p>
            </div>
        </footer>
    );
}
