import axios from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/app/libs/toast";

import { SafeUser } from "../types";
import useLoginModal from "./useLoginModal";

interface IUseFavorite {
  listingId: string;
  currentUser?: SafeUser | null;
}

const useFavorite = ({ listingId, currentUser }: IUseFavorite) => {
  const router = useRouter();
  const loginModal = useLoginModal();

  const serverFavorite = (currentUser?.favoriteIds || []).includes(listingId);
  const [hasFavorited, setHasFavorited] = useState(serverFavorite);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => setHasFavorited(serverFavorite), [serverFavorite]);

  const toggleFavorite = useCallback(
    async (e: React.SyntheticEvent) => {
      e.stopPropagation();

      if (!currentUser) {
        return loginModal.onOpen();
      }

      if (isUpdating) return;
      const nextFavorite = !hasFavorited;
      setHasFavorited(nextFavorite);
      setIsUpdating(true);
      try {
        let request;

        if (hasFavorited) {
          request = () => axios.delete(`/api/favorites/${listingId}`);
        } else {
          request = () => axios.post(`/api/favorites/${listingId}`);
        }

        await request();
        router.refresh();
        toast.success(nextFavorite ? "Saved to favourites" : "Removed from favourites");
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        setHasFavorited(!nextFavorite);
        toast.error("Could not update favourites. Try again.");
      } finally {
        setIsUpdating(false);
      }
    },
    [currentUser, hasFavorited, isUpdating, listingId, loginModal, router]
  );

  return {
    hasFavorited,
    toggleFavorite,
    isUpdating,
  };
};

export default useFavorite;
