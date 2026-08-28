export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/trips/:path*",
    "/reservations/:path*",
    "/properties/:path*",
    "/favorites/:path*",
    "/profile/:path*",
    "/messages/:path*",
    "/confirm-reservation/:path*",
    "/review/:path*",
    "/edit-utility/:path*",
    "/host/:path*",
  ],
};
