"use client";

import { useEffect, useState, ReactNode, FC } from "react";

// Define props interface
interface ClientOnlyProps {
  children: ReactNode;
}

// ClientOnly component
const ClientOnly: FC<ClientOnlyProps> = ({ children }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

export default ClientOnly;
