'use client';

import Container from "../Container";
import CategoryBox from "../CategoryBox";
import HorizontalScroller from "../HorizontalScroller";
import { usePathname, useSearchParams } from "next/navigation";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IconCamper, IconCar, IconCaravan, IconMotorbike, IconSailboat, IconSpeedboat, IconSwimming, IconTent, IconTir, IconTruck } from "@tabler/icons-react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faTrailer } from "@fortawesome/free-solid-svg-icons";
import { Van } from "@phosphor-icons/react";

export const categories = [
    {
        label: 'Car',
        icon: () => <IconCar size={24} stroke={1.5} />,
        description: 'These are the amazing caravans!'
    },
    {
        label: 'Utes',
        icon: () => <IconTir size={24} stroke={1.5} />,
        description: 'These are the Utes!'
    },
    {
        label: 'Bikes',
        icon: () => <IconMotorbike size={24} stroke={1.5} />,
        description: 'These are the speedy bikes!'
    },
    {
        label: 'Caravans',
        icon: () => <IconCaravan size={24} stroke={1.5} />,
        description: 'These are the amazing caravans!'
    },
    {
        label: 'Motorhomes',
        icon: () => <IconCamper size={24} stroke={1.5} />,
        description: 'These are the amazing Motorhomes!'
    },
    {
        label: 'Boats',
        icon: () => <IconSailboat size={24} stroke={1.5} />,
        description: 'These are the wavey boats!'
    },
    {
        label: 'JetSkies',
        icon: () => <IconSwimming size={24} stroke={1.5} />,
        description: 'These are the fast jetskies!'
    },
    {
        label: 'Yachts',
        icon: () => <IconSpeedboat size={24} stroke={1.5} />,
        description: 'These are the fast jetskies!'
    },
    {
        label: 'Vans',
        icon: () => <Van size={24} />,
        description: 'These are very durable vans!'
    },
    {
        label: 'Trucks',
        icon: () => <IconTruck size={24} stroke={1.5} />,
        description: 'Heavy-duty trucks for transport and hauling!'
    },
    // {
    //     label: 'Accessories',
    //     icon: () => <IconTent size={28} stroke={1.5} />,
    //     description: 'These are better accessories to have!'
    // },
]

const Categories = () => {
    const params = useSearchParams();
    const category = params?.get('category');
    const pathname = usePathname();

    const isMainPage = pathname === '/';

    if (!isMainPage) {
        return null;
    }
    return (
        <Container>
            <HorizontalScroller
                ariaLabel="Vehicle categories"
                className="gap-1 py-1 sm:gap-2 md:grid md:grid-cols-10 md:snap-none md:overflow-x-visible"
            >
                {categories.map((item) => (
                    <div
                        key={item.label}
                        className="basis-[28%] shrink-0 snap-start sm:basis-[18%] md:basis-auto md:shrink md:snap-none"
                    >
                        <CategoryBox
                            label={item.label}
                            selected={category == item.label}
                            icon={item.icon}
                        />
                    </div>
                ))}
            </HorizontalScroller>
        </Container>
    );
};

export default Categories;
