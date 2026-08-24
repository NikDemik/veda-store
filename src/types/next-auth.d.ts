import type { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
      user: {
          id: string;
          role: UserRole;
          organizationId: number;
          organizationName: string | null;
          organizationInn: string;
          email?: string | null;
          name?: string | null;
      };
  }

  interface User {
    role: UserRole;
    organizationId: number;
    organizationName: string | null;
    organizationInn: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    organizationId?: number;
    organizationName?: string | null;
    organizationInn?: string;
  }
}
