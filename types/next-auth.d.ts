import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: string;
      company?: string | null;
      website?: string | null;
    };
  }

  interface User {
    role?: string;
    company?: string | null;
    website?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    company?: string | null;
    website?: string | null;
  }
}
