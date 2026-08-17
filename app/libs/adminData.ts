import "server-only";

import prisma from "@/app/libs/prismadb";

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const normaliseStatus = (status: string) => status.trim().toUpperCase();

export async function getAdminDashboardData() {
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const previousThirtyDays = new Date(now.getTime() - 60 * 86_400_000);

  const [
    totalUsers, totalListings, totalBookings, totalReviews, totalMessages,
    verifiedProfiles, licencesUploaded, activeUsers, newUsersCurrent, newUsersPrevious,
    reservations, usersByMonth, listingsByMonth, statusGroups, categoryGroups, stateGroups,
    revenue, rating, recentUsers, recentListings, recentBookings, favouriteRows, topReviews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.reservation.count(),
    prisma.review.count(),
    prisma.message.count(),
    prisma.user.count({ where: { profileVerified: "Y" } }),
    prisma.user.count({ where: { licenseImage: { not: null } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: previousThirtyDays, lt: thirtyDaysAgo } } }),
    prisma.reservation.findMany({ where: { createdAt: { gte: twelveMonthsAgo } }, select: { createdAt: true, totalPrice: true, totalFees: true, redriveFee: true, serviceFee: true, status: true, startDate: true, endDate: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: twelveMonthsAgo } }, select: { createdAt: true } }),
    prisma.listing.findMany({ where: { createdAt: { gte: twelveMonthsAgo } }, select: { createdAt: true } }),
    prisma.reservation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.listing.groupBy({ by: ["category"], _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 7 }),
    prisma.listing.groupBy({ by: ["state"], _count: { _all: true }, orderBy: { _count: { state: "desc" } }, take: 8 }),
    prisma.reservation.aggregate({ _sum: { totalPrice: true, totalFees: true, redriveFee: true, serviceFee: true, insuranceFee: true }, _avg: { totalPrice: true } }),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 7, select: { id: true, name: true, email: true, image: true, role: true, createdAt: true, emailVerified: true, licenseImage: true, profileVerified: true } }),
    prisma.listing.findMany({ orderBy: { createdAt: "desc" }, take: 7, select: { id: true, title: true, category: true, state: true, suburb: true, price: true, createdAt: true, imageSrcs: true, user: { select: { name: true, email: true } }, _count: { select: { reservations: true, reviews: true } } } }),
    prisma.reservation.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, status: true, createdAt: true, startDate: true, endDate: true, totalPrice: true, totalFees: true, user: { select: { name: true, email: true } }, listing: { select: { title: true, state: true } } } }),
    prisma.user.findMany({ select: { favoriteIds: true } }),
    prisma.review.findMany({ select: { listingId: true, rating: true } }),
  ]);

  const monthly = Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + offset, 1);
    return { key: monthKey(date), label: date.toLocaleDateString("en-AU", { month: "short" }), bookings: 0, revenue: 0, users: 0, listings: 0 };
  });
  const monthMap = new Map(monthly.map((month) => [month.key, month]));
  reservations.forEach((reservation) => { const month = monthMap.get(monthKey(reservation.createdAt)); if (month) { month.bookings += 1; month.revenue += reservation.redriveFee + reservation.serviceFee; } });
  usersByMonth.forEach((user) => { const month = monthMap.get(monthKey(user.createdAt)); if (month) month.users += 1; });
  listingsByMonth.forEach((listing) => { const month = monthMap.get(monthKey(listing.createdAt)); if (month) month.listings += 1; });

  const statusCounts = new Map<string, number>();
  statusGroups.forEach((group) => statusCounts.set(normaliseStatus(group.status), (statusCounts.get(normaliseStatus(group.status)) || 0) + group._count._all));
  const approved = (statusCounts.get("APPROVED") || 0) + (statusCounts.get("COMPLETED") || 0);
  const bookingDays = reservations.reduce((total, reservation) => total + Math.max(1, Math.ceil((reservation.endDate.getTime() - reservation.startDate.getTime()) / 86_400_000)), 0);
  const listingRatings = new Map<string, { sum: number; count: number }>();
  topReviews.forEach((review) => { const value = listingRatings.get(review.listingId) || { sum: 0, count: 0 }; value.sum += review.rating; value.count += 1; listingRatings.set(review.listingId, value); });
  const topListings = await prisma.listing.findMany({ orderBy: { reservations: { _count: "desc" } }, take: 5, select: { id: true, title: true, state: true, price: true, _count: { select: { reservations: true, reviews: true } } } });

  const percentageChange = newUsersPrevious ? ((newUsersCurrent - newUsersPrevious) / newUsersPrevious) * 100 : newUsersCurrent ? 100 : 0;

  return {
    generatedAt: now.toISOString(),
    metrics: {
      totalUsers, totalListings, totalBookings, totalReviews, totalMessages,
      activeUsers, verifiedProfiles, licencesUploaded,
      grossBookingValue: revenue._sum.totalPrice || 0,
      collectedValue: revenue._sum.totalFees || 0,
      platformRevenue: (revenue._sum.redriveFee || 0) + (revenue._sum.serviceFee || 0),
      protectionFees: revenue._sum.insuranceFee || 0,
      averageBookingValue: Math.round(revenue._avg.totalPrice || 0),
      averageRating: Number((rating._avg.rating || 0).toFixed(1)),
      approvalRate: totalBookings ? Math.round((approved / totalBookings) * 100) : 0,
      averageTripDays: reservations.length ? Number((bookingDays / reservations.length).toFixed(1)) : 0,
      savedVehicles: favouriteRows.reduce((total, user) => total + user.favoriteIds.length, 0),
      newUsersCurrent, userGrowth: Number(percentageChange.toFixed(1)),
    },
    monthly,
    statuses: Array.from(statusCounts, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    categories: categoryGroups.map((group) => ({ label: group.category, value: group._count._all })),
    states: stateGroups.map((group) => ({ label: group.state, value: group._count._all })),
    recentUsers,
    recentListings,
    recentBookings,
    topListings: topListings.map((listing) => ({ ...listing, averageRating: listingRatings.has(listing.id) ? Number((listingRatings.get(listing.id)!.sum / listingRatings.get(listing.id)!.count).toFixed(1)) : 0 })),
  };
}

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;
