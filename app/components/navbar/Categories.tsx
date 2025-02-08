'use client';

import Container from "../Container";
import CategoryBox from "../CategoryBox";
import { usePathname, useSearchParams } from "next/navigation";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTruck, faCaravan, faTruckPickup, faSailboat, faVanShuttle, faPersonBiking, faTents, faWater, faTrailer } from "@fortawesome/free-solid-svg-icons";

export const categories = [
    {
        label: 'Caravans',
        icon: () => <FontAwesomeIcon icon={faCaravan} className="text-2xl" />,
        description: 'These are the amazing caravans!'
    },
    {
        label: 'Utes',
        icon: () => <FontAwesomeIcon icon={faTruckPickup} className="text-2xl" />,
        description: 'These are the Utes!'
    },
    {
        label: 'Boats',
        icon: () => <FontAwesomeIcon icon={faSailboat} className="text-2xl" />,
        description: 'These are the wavey boats!'
    },
    {
        label: 'Bikes',
        icon: () => <FontAwesomeIcon icon={faPersonBiking} className="text-2xl" />,
        description: 'These are the speedy bikes!'
    },
    {
        label: 'JetSkies',
        icon: () => <FontAwesomeIcon icon={faWater} className="text-2xl" />,
        description: 'These are the fast jetskies!'
    },
    {
        label: 'Motorhomes',
        icon: () => <FontAwesomeIcon icon={faCaravan} className="text-2xl" />,
        description: 'These are the amazing Motorhomes!'
    },
    {
        label: 'Vans',
        icon: () => <FontAwesomeIcon icon={faVanShuttle} className="text-2xl" />,
        description: 'These are very durable vans!'
    },
    {
        label: 'Trucks',
        icon: () => <FontAwesomeIcon icon={faTruck} className="text-2xl" />,
        description: 'Heavy-duty trucks for transport and hauling!'
    },
    {
        label: 'Trailers',
        icon: () => <FontAwesomeIcon icon={faTrailer} className="text-2xl" />,
        description: 'Heavy-duty trucks for transport and hauling!'
    },
    {
        label: 'Accessories',
        icon: () => <FontAwesomeIcon icon={faTents} className="text-2xl" />,
        description: 'These are better accessories to have!'
    },
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
          pt-4
          flex
          flex-row
          items-center
          justify-between
          overflow-x-auto
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
