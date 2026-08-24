export type CatalogFilters = {
    series?: string | string[];
    currentA?: string | string[];
    specs?: string | string[];
    sort?: CatalogSort | CatalogSort[];
};

export type CatalogSort = 'popular' | 'price-asc' | 'price-desc' | 'name-asc';
