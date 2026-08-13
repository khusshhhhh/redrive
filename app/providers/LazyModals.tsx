"use client";

import dynamic from "next/dynamic";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useRentModal from "@/app/hooks/useRentModal";
import useSearchModal from "@/app/hooks/useSearchModal";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LoginModal = dynamic(() => import("@/app/components/modals/LoginModal"), { ssr: false });
const RegisterModal = dynamic(() => import("@/app/components/modals/RegisterModal"), { ssr: false });
const RentModal = dynamic(() => import("@/app/components/modals/RentModal"), { ssr: false });
const SearchModal = dynamic(() => import("@/app/components/modals/SearchModal"), { ssr: false });

export default function LazyModals() {
  const login = useLoginModal();
  const register = useRegisterModal();
  const rent = useRentModal();
  const search = useSearchModal();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  // A modal should never survive navigation to a different page. This also
  // repairs stale inline overflow left by an older deployed version as soon as
  // the user navigates within the app.
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    login.onClose();
    register.onClose();
    rent.onClose();
    search.onClose();
    document.body.style.overflow = "";
  }, [pathname, login, register, rent, search]);

  useEffect(() => {
    if (!login.isOpen && !register.isOpen && !rent.isOpen && !search.isOpen) {
      document.body.style.overflow = "";
    }
  }, [login.isOpen, register.isOpen, rent.isOpen, search.isOpen]);

  return (
    <>
      {login.isOpen && <LoginModal />}
      {register.isOpen && <RegisterModal />}
      {rent.isOpen && <RentModal />}
      {search.isOpen && <SearchModal />}
    </>
  );
}
