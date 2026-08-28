import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "@/app/libs/toast";

import { SafeUser } from "../types";
import useLoginModal from "./useLoginModal";
import { useOptimisticAction } from "./useOptimisticAction";

interface IUseFavorite {
  listingId: string;
  currentUser?: SafeUser | null;
}

const useFavorite = ({ listingId, currentUser }: IUseFavorite) => {
  const router = useRouter();
  const loginModal = useLoginModal();

  const serverFavorite = (currentUser?.favoriteIds || []).includes(listingId);
  const favorite = useOptimisticAction<boolean>(serverFavorite, {
    onError: () => toast.error("Could not update favourites. Try again."),
  });

  const toggleFavorite = useCallback(
    async (e: React.SyntheticEvent) => {
      e.stopPropagation();

      if (!currentUser) {
        return loginModal.onOpen();
      }
      if (favorite.pending) return;

      const next = !favorite.value;
      await favorite.run(next, async () => {
        await (next
          ? axios.post(`/api/favorites/${listingId}`)
          : axios.delete(`/api/favorites/${listingId}`));
        router.refresh();
        toast.success(next ? "Saved to favourites" : "Removed from favourites");
      });
    },
    [currentUser, favorite, listingId, loginModal, router],
  );

  return {
    hasFavorited: favorite.value,
    toggleFavorite,
    isUpdating: favorite.showPending,
  };
};

export default useFavorite;
