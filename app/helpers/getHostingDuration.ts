import { differenceInDays } from "date-fns";

export function getHostingDuration(startDate: Date) {
  const days = differenceInDays(new Date(), startDate);

  // Return a string in days, weeks, months, or years
  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"}`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? "" : "s"}`;
  } else {
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? "" : "s"}`;
  }
}
