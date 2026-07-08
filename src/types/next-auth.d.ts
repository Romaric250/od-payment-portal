import type { DefaultSession } from "next-auth";
import type { AccessLevel, AdminRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AdminRole;
      accessLevel: AccessLevel;
    } & DefaultSession["user"];
  }

  interface User {
    role: AdminRole;
    accessLevel: AccessLevel;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AdminRole;
    accessLevel: AccessLevel;
  }
}

export {};
