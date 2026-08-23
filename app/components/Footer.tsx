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
    <footer className="mb-20 bg-white border-t border-hairline mt-16 md:mb-0">
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 gap-9 px-4 py-12 sm:grid-cols-2 md:px-10 lg:grid-cols-4">
        <div>
          <h3 className="text-title-sm font-medium text-ink mb-4">Support</h3>
          <ul className="flex flex-col gap-3 text-sm text-body">
            <li><Link href="/help-centre" className="hover:underline hover:text-ink">Help Centre</Link></li>
            <li><Link href="/safety" className="hover:underline hover:text-ink">Safety information</Link></li>
            <li><Link href="/cancellation-options" className="hover:underline hover:text-ink">Cancellation options</Link></li>
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
            <li><Link href="/vehicle-protection" className="hover:underline hover:text-ink">Vehicle protection</Link></li>
            <li><Link href="/hosting-resources" className="hover:underline hover:text-ink">Hosting resources</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-title-sm font-medium text-ink mb-4">Explore</h3>
          <ul className="flex flex-col gap-3 text-sm text-body">
            <li><Link href="/blog" className="hover:underline hover:text-ink">Travel and sharing journal</Link></li>
            <li><Link href="/newsroom" className="hover:underline hover:text-ink">Newsroom</Link></li>
            <li><Link href="/favorites" className="hover:underline hover:text-ink">Saved vehicles</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-title-sm font-medium text-ink mb-4">Redrive</h3>
          <ul className="flex flex-col gap-3 text-sm text-body">
            <li><Link href="/about" className="hover:underline hover:text-ink">About</Link></li>
            <li><Link href="/careers" className="hover:underline hover:text-ink">Careers</Link></li>
            <li><Link href="/safety" className="hover:underline hover:text-ink">Trust and safety</Link></li>
            <li><Link href="/community-standards" className="hover:underline hover:text-ink">Community standards</Link></li>
            <li><Link href="/data-security" className="hover:underline hover:text-ink">Data security</Link></li>
            <li className="border-t border-hairline-soft pt-3"><Link href="/admin/login" className="text-xs text-muted hover:text-ink hover:underline">Admin</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-hairline-soft">
        <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-caption-sm text-muted">
          <span>© {new Date().getFullYear()} Redrive. Built for Australian journeys.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/account-deletion" className="hover:underline">Account deletion</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
