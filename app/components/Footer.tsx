"use client";

import Link from "next/link";
import useRentModal from "@/app/hooks/useRentModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import { SafeUser } from "@/app/types";

interface FooterProps {
  currentUser?: SafeUser | null;
}

const Footer: React.FC<FooterProps> = ({ currentUser }) => {
  const rentModal = useRentModal();
  const loginModal = useLoginModal();

  const onListCar = () => {
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }
    rentModal.onOpen();
  };

  return (
    <footer className="bg-white border-t border-hairline mt-16">
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <h3 className="text-title-sm font-medium text-ink mb-4">Support</h3>
          <ul className="flex flex-col gap-3 text-sm text-body">
            <li>Help Center</li>
            <li>Safety information</li>
            <li>Cancellation options</li>
          </ul>
        </div>

        <div>
          <h3 className="text-title-sm font-medium text-ink mb-4">Hosting</h3>
          <ul className="flex flex-col gap-3 text-sm text-body">
            <li>
              <button
                onClick={onListCar}
                className="hover:underline text-ink font-medium"
              >
                List your car
              </button>
            </li>
            <li>Vehicle protection</li>
            <li>Hosting resources</li>
          </ul>
        </div>

        <div>
          <h3 className="text-title-sm font-medium text-ink mb-4">Redrive</h3>
          <ul className="flex flex-col gap-3 text-sm text-body">
            <li>About</li>
            <li>Careers</li>
            <li>Newsroom</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-hairline-soft">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption-sm text-muted">
          <span>© {new Date().getFullYear()} Redrive, Inc.</span>
          <div className="flex gap-4">
            <Link href="/favorites" className="hover:underline">Favourites</Link>
            <Link href="/trips" className="hover:underline">Trips</Link>
            <Link href="/messages" className="hover:underline">Messages</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
