import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/audit/:path*",
    "/keywords/:path*",
    "/rank-tracker/:path*",
    "/backlinks/:path*",
    "/technical/:path*",
    "/content/:path*",
    "/briefs/:path*",
    "/outreach/:path*",
    "/agent/:path*",
    "/authority/:path*",
    "/chat/:path*",
    "/projects/:path*",
    "/ai-analytics/:path*",
    "/ops/:path*",
    "/reports/:path*",
    "/billing/:path*",
    "/settings/:path*",
    "/competitors/:path*",
  ],
};
