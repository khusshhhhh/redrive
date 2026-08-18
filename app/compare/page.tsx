import { differenceInCalendarDays } from "date-fns";
import Container from "../components/Container";
import getComparisonListings from "../actions/getComparisonListings";
import CompareClient from "./CompareClient";

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string; startDate?: string; endDate?: string }> }) {
  const params = await searchParams;
  const vehicles = await getComparisonListings((params.ids || "").split(","));
  const tripDays = params.startDate && params.endDate
    ? Math.max(1, differenceInCalendarDays(new Date(params.endDate), new Date(params.startDate)) + 1)
    : null;
  return <Container><CompareClient vehicles={vehicles} tripDays={tripDays} /></Container>;
}
