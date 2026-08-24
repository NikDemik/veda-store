import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const credentialsSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: 'jwt' },
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                const parsed = credentialsSchema.safeParse(credentials);
                if (!parsed.success) return null;

                const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            role: true,
            organizationId: true,
            organization: {
              select: {
                shortName: true,
                fullName: true,
                inn: true,
                isActive: true,
              },
            },
            isActive: true,
          },
        });

                if (!user || !user.isActive || !user.organization?.isActive || !user.passwordHash) return null;

                const isValid = await compare(parsed.data.password, user.passwordHash);
                if (!isValid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization?.shortName ?? user.organization?.fullName ?? null,
          organizationInn: user.organization?.inn ?? '',
        };
      },
    }),
  ],
  callbacks: {
        jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName ?? null;
        token.organizationInn = user.organizationInn ?? '';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as typeof session.user.role;
        session.user.organizationId = token.organizationId as number;
        session.user.organizationName = (token.organizationName as string | null) ?? null;
        session.user.organizationInn = (token.organizationInn as string) ?? '';
      }
      return session;
    },
  },
});
