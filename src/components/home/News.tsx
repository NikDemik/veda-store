export default function News() {
    return (
        <section className="relative w-screen">
            <div className="relative z-10 container mx-auto px-5">
                <h1 className=" uppercase mb-8">Новости</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* {aboutCardData.map((card) => (
                    <div
                        key={card.id}
                        className="flex flex-col items-center bg-grey pt-5 pb-10 rounded-[8px] group hover:bg-dark-accent transition-all duration-200"
                    >
                        <p className=" text-9xl font-bold text-transparent text-stroke-2 text-stroke-dark-accent group-hover:text-stroke-white text-center uppercase transition-all duration-200">
                            {card.title}
                        </p>
                        <p className=" max-w-63 text-base text-dark-accent group-hover:text-white text-center transition-all duration-200">
                            {card.description}
                        </p>
                    </div>
                ))} */}
                </div>
            </div>
        </section>
    );
}
