import { create } from "zustand";

interface LoginModalStore {
  isOpen: boolean;
  /** Where to send the user after a successful sign-in, if anywhere. */
  redirectTo: string | null;
  onOpen: (redirectTo?: string) => void;
  onClose: () => void;
  /** Read and clear the pending redirect target. */
  consumeRedirect: () => string | null;
}

const useLoginModal = create<LoginModalStore>((set, get) => ({
  isOpen: false,
  redirectTo: null,
  // Guard the argument: several call sites pass `onOpen` straight to an onClick
  // handler, which would otherwise hand us a DOM event as the redirect target.
  onOpen: (redirectTo?: string) =>
    set({ isOpen: true, redirectTo: typeof redirectTo === "string" ? redirectTo : null }),
  onClose: () => set({ isOpen: false, redirectTo: null }),
  consumeRedirect: () => {
    const target = get().redirectTo;
    set({ redirectTo: null });
    return target;
  },
}));

export default useLoginModal;
