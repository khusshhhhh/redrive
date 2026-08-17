'use client';

import Container from "../Container";
import CategoryBox from "../CategoryBox";
import { usePathname, useSearchParams } from "next/navigation";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { IconCamper, IconCar, IconCaravan, IconMotorbike, IconSailboat, IconSpeedboat, IconSwimming, IconTent, IconTir, IconTruck } from "@tabler/icons-react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faTrailer } from "@fortawesome/free-solid-svg-icons";
import { Van } from "@phosphor-icons/react";

export const categories = [
    {
        label: 'Car',
        icon: () => <IconCar size={28} stroke={1.5} />,
        description: 'These are the amazing caravans!'
    },
    {
        label: 'Utes',
        icon: () => <IconTir size={28} stroke={1.5} />,
        description: 'These are the Utes!'
    },
    {
        label: 'Bikes',
        icon: () => <IconMotorbike size={28} stroke={1.5} />,
        description: 'These are the speedy bikes!'
    },
    {
        label: 'Caravans',
        icon: () => <IconCaravan size={28} stroke={1.5} />,
        description: 'These are the amazing caravans!'
    },
    {
        label: 'Motorhomes',
        icon: () => <IconCamper size={28} stroke={1.5} />,
        description: 'These are the amazing Motorhomes!'
    },
    {
        label: 'Boats',
        icon: () => <IconSailboat size={28} stroke={1.5} />,
        description: 'These are the wavey boats!'
    },
    {
        label: 'JetSkies',
        icon: () => <IconSwimming size={28} stroke={1.5} />,
        description: 'These are the fast jetskies!'
    },
    {
        label: 'Yachts',
        icon: () => <IconSpeedboat size={28} stroke={1.5} />,
        description: 'These are the fast jetskies!'
    },
    {
        label: 'Vans',
        icon: () => <Van size={28} />,
        description: 'These are very durable vans!'
    },
    {
        label: 'Trucks',
        icon: () => <IconTruck size={28} stroke={1.5} />,
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
            <div
                className="
          pt-1
          pb-1
          flex
          flex-row
          items-center
          justify-start
          gap-1
          overflow-x-auto
          overscroll-x-contain
          snap-x
          scrollbar-hide
        "
            >
                {categories.map((item) => (
                    <CategoryBox
                        key={item.label}
                        label={item.label}
                        selected={category == item.label}
                        icon={item.icon}
                    />
                ))}

            </div>
        </Container>
    );
};

export default Categories;
