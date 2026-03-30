import NextAuth from "next-auth";
import { db } from "./db";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false;

      await db.user.upsert({
        where: { spotifyId: profile.id as string },
        update: {
          name: profile.display_name as string | undefined,
          email: profile.email as string | undefined,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          tokenExpiry: new Date(Date.now() + (account.expires_in as number) * 1000),
        },
        create: {
          spotifyId: profile.id as string,
          name: profile.display_name as string | undefined,
          email: profile.email as string | undefined,
          accessToken: account.access_token!,
          refreshToken: account.refresh_token!,
          tokenExpiry: new Date(Date.now() + (account.expires_in as number) * 1000),
        },
      });

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.spotifyId = profile.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.spotifyId) {
        session.user.id = token.spotifyId as string;
      }
      return session;
    },
  },
});
