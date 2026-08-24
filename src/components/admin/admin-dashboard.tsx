'use client';

import { useState } from 'react';
import { AdminNavigation, productTabs, referenceTabs } from './admin-navigation';
import { BrandsTab } from './tabs/brands-tab';
import { CategoriesTab } from './tabs/categories-tab';
import { ContactLeadsTab } from './tabs/contact-leads-tab';
import { OrdersTab } from './tabs/orders-tab';
import { OrganizationsTab } from './tabs/organizations-tab';
import { ProductFormTab } from './tabs/product-form-tab';
import { ProductsListTab } from './tabs/products-list-tab';
import { SeriesTab } from './tabs/series-tab';
import { SettingsTab } from './tabs/settings-tab';
import { UnitMeasuresTab } from './tabs/unit-measures-tab';
import { ProductTypesTab } from './tabs/product-types-tab';
import type { AdminDashboardProps, AdminProduct, AdminTab } from './types';

export function AdminDashboard({
    orders,
    contactLeads,
    organizations,
    products,
    categories,
    brands,
    series,
    unitMeasures,
    productTypes,
    variantGroups,
    attributeDefinitions,
    companyProfile,
    notificationSetting,
    labels,
}: AdminDashboardProps) {
    const [activeTab, setActiveTab] = useState<AdminTab>('orders');
    const [isProductsMenuOpen, setIsProductsMenuOpen] = useState(true);
    const [isReferencesMenuOpen, setIsReferencesMenuOpen] = useState(true);
    const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
    const productsMenuActive =
        activeTab === 'product-form' || productTabs.some((tab) => tab.id === activeTab);
    const referencesMenuActive = referenceTabs.some((tab) => tab.id === activeTab);

    return (
        <section className="w-screen bg-[linear-gradient(180deg,#eef3f9_0%,#ffffff_28%)] py-8 sm:py-10 lg:py-12">
            <div className="mx-auto px-5">
                <div className="rounded-[2.25rem] bg-[linear-gradient(135deg,#0e1623_0%,#12315f_100%)] px-6 py-8 text-white sm:px-8 sm:py-10">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-4">
                            <p className="text-sm uppercase tracking-[0.28em] text-white/60">
                                Операционная панель
                            </p>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-semibold sm:text-4xl">
                                    Администрирование
                                </h1>
                                <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                                    Управление заказами, клиентскими организациями и каталогом в
                                    единой панели.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                            <HeroMetric label="Заказы" value={orders.length.toString()} />
                            <HeroMetric label="Заявки" value={contactLeads.length.toString()} />
                            <HeroMetric label="Клиенты" value={organizations.length.toString()} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:gap-8">
                    <AdminNavigation
                        activeTab={activeTab}
                        isProductsMenuOpen={isProductsMenuOpen}
                        isReferencesMenuOpen={isReferencesMenuOpen}
                        productsMenuActive={productsMenuActive}
                        referencesMenuActive={referencesMenuActive}
                        onToggleProductsMenu={() => setIsProductsMenuOpen((isOpen) => !isOpen)}
                        onToggleReferencesMenu={() =>
                            setIsReferencesMenuOpen((isOpen) => !isOpen)
                        }
                        onTabChange={(tab) => {
                            if (tab === 'product-form') {
                                setEditingProduct(null);
                            }
                            setActiveTab(tab);
                        }}
                    />

                    <div className="space-y-6 xl:space-y-8">
                        {activeTab === 'orders' ? (
                            <OrdersTab orders={orders} labels={labels} />
                        ) : null}
                        {activeTab === 'contact-leads' ? (
                            <ContactLeadsTab contactLeads={contactLeads} labels={labels.leadStatus} />
                        ) : null}
                        {activeTab === 'organizations' ? (
                            <OrganizationsTab organizations={organizations} />
                        ) : null}
                        {activeTab === 'products-list' ? (
                            <ProductsListTab
                                products={products}
                                onAddProduct={() => {
                                    setEditingProduct(null);
                                    setActiveTab('product-form');
                                }}
                                onEditProduct={(product) => {
                                    setEditingProduct(product);
                                    setActiveTab('product-form');
                                }}
                            />
                        ) : null}
                        {activeTab === 'product-form' ? (
                            <ProductFormTab
                                brands={brands}
                                categories={categories}
                                series={series}
                                unitMeasures={unitMeasures}
                                productTypes={productTypes}
                                variantGroups={variantGroups}
                                attributeDefinitions={attributeDefinitions}
                                products={products}
                                editingProduct={editingProduct}
                                onEditCancel={() => setEditingProduct(null)}
                                onSaved={() => {
                                    setEditingProduct(null);
                                    setActiveTab('products-list');
                                }}
                            />
                        ) : null}
                        {activeTab === 'brands' ? <BrandsTab brands={brands} /> : null}
                        {activeTab === 'categories' ? (
                            <CategoriesTab categories={categories} />
                        ) : null}
                        {activeTab === 'series' ? <SeriesTab series={series} /> : null}
                        {activeTab === 'unit-measures' ? (
                            <UnitMeasuresTab unitMeasures={unitMeasures} />
                        ) : null}
                        {activeTab === 'product-types' ? (
                            <ProductTypesTab productTypes={productTypes} />
                        ) : null}
                        {activeTab === 'settings' ? (
                            <SettingsTab
                                companyProfile={companyProfile}
                                notificationSetting={notificationSetting}
                            />
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl border border-white/15 bg-white/8 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
    );
}
