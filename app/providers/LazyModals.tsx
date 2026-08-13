"use client";

import dynamic from "next/dynamic";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useRentModal from "@/app/hooks/useRentModal";
import useSearchModal from "@/app/hooks/useSearchModal";

const LoginModal = dynamic(() => import("@/app/components/modals/LoginModal"), { ssr: false });
const RegisterModal = dynamic(() => import("@/app/components/modals/RegisterModal"), { ssr: false });
const RentModal = dynamic(() => import("@/app/components/modals/RentModal"), { ssr: false });
const SearchModal = dynamic(() => import("@/app/components/modals/SearchModal"), { ssr: false });

export default function LazyModals() {
  const login = useLoginModal();
  const register = useRegisterModal();
  const rent = useRentModal();
  const search = useSearchModal();

  return (
    <>
      {login.isOpen && <LoginModal />}
      {register.isOpen && <RegisterModal />}
      {rent.isOpen && <RentModal />}
      {search.isOpen && <SearchModal />}
    </>
  );
}
