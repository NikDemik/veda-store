export function isExcludedCatalogDocument(document) {
    return ['title', 'fileName', 'url', 'sourceUrl', 'localPath'].some((field) => {
        let text = document?.[field];
        if (typeof text !== 'string') return false;
        try { text = decodeURIComponent(text); } catch { /* Keep malformed source text searchable. */ }
        return /(?:^|[^a-z])veda[\s_.-]*cst(?=$|[^a-z])/i.test(text);
    });
}

// Covers nested sourceVariants and source snapshots without changing raw HTML.
export function removeExcludedCatalogDocuments(value) {
    let removed = 0;
    function visit(item) {
        if (Array.isArray(item)) return item.map(visit);
        if (!item || typeof item !== 'object') return item;
        return Object.fromEntries(Object.entries(item).map(([key, child]) => {
            if (key === 'documents' && Array.isArray(child)) {
                const included = child.filter((document) => !isExcludedCatalogDocument(document));
                removed += child.length - included.length;
                return [key, included.map(visit)];
            }
            return [key, visit(child)];
        }));
    }
    const cleaned = visit(value);
    return { cleaned, removed };
}
