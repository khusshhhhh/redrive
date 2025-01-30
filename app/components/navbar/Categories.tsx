import Container from "../Container";
import { FaCaravan } from "react-icons/fa6";
import { FaSailboat } from "react-icons/fa6";
import { PiVanFill } from "react-icons/pi";
import { TbMotorbike } from "react-icons/tb";
import { MdSurfing } from "react-icons/md";
import { FaTruckPickup } from "react-icons/fa";
import CategoryBox from "../CategoryBox";

export const categories = [
    {
        label: 'Caravans',
        icon: FaCaravan,
        description: 'These are the amazing caravans!'
    },
    {
        label: 'Utes',
        icon: FaTruckPickup,
        description: 'These are the Utes!'
    },
    {
        label: 'Boats',
        icon: FaSailboat,
        description: 'These are the wavey boats!'
    },
    {
        label: 'Jet-Skies',
        icon: MdSurfing,
        description: 'These are the fast jetskies!'
    },
    {
        label: 'Bikes',
        icon: TbMotorbike,
        description: 'These are the speedy bikes!'
    },
    {
        label: 'Motorhomes',
        icon: PiVanFill,
        description: 'These are the amazing caravans!'
    },
]

const Categories = () => {
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
                        description={item.description}
                        icon={item.icon}
                    />
                ))}

            </div>
        </Container>
    );
};

export default Categories;
