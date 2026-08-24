type CatalogHeaderProps = {
    category: {
        name: string;
        description: string | null;
    };
};

export default function CatalogHeader({ category }: CatalogHeaderProps) {
    return (
        <div className=" flex justify-between items-center mb-4">
            <div>
                <h1 className=" uppercase text-black">{category.name}</h1>
                {category.description && (
                    <p className="mt-2 max-w-2xl text-sm text-dark-accent/70">
                        {category.description}
                    </p>
                )}
            </div>
        </div>
    );
}
