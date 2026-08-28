"use client";

import RLSkeleton, { SkeletonTheme, type SkeletonProps } from "react-loading-skeleton";

/**
 * App-themed wrapper around `react-loading-skeleton`. The library grows each
 * placeholder to the width of its container and animates a shimmer sweep, so
 * skeletons track the real layout instead of being hand-drawn ghost boxes.
 *
 * Wrap a loading view in <SkeletonScope> once, then use <Skeleton /> freely.
 */
export function SkeletonScope({ children }: { children: React.ReactNode }) {
  return (
    <SkeletonTheme baseColor="#E7E7E7" highlightColor="#F4F4F4" borderRadius="0.5rem" duration={1.4}>
      {children}
    </SkeletonTheme>
  );
}

export function Skeleton(props: SkeletonProps) {
  return <RLSkeleton {...props} />;
}

export default Skeleton;
