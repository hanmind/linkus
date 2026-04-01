import NextAuth from "next-auth";
import { db } from "./db";
import { authConfig } from "./auth.config";

function getTokenExpiry(expiresIn?: number) {
  return new Date(Date.now() + (expiresIn ?? 3600) * 1000);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  debug: true,
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) {
        console.error("[auth][signIn] Missing account or profile", {
          hasAccount: !!account,
          hasProfile: !!profile,
        });
        return false;
      }

      if (!account.access_token) {
        console.error("[auth][signIn] Missing access token");
        return false;
      }

      if (!account.refresh_token) {
        const existingUser = await db.user.findUnique({
          where: { spotifyId: profile.id as string },
          select: { id: true },
        });

        if (!existingUser) {
          console.error("[auth][signIn] Missing refresh token for new user");
          return false;
        }
      }

      try {
        await db.user.upsert({
          where: { spotifyId: profile.id as string },
          update: {
            name: profile.display_name as string | undefined,
            email: profile.email as string | undefined,
            accessToken: account.access_token,
            ...(account.refresh_token
              ? { refreshToken: account.refresh_token }
              : {}),
            tokenExpiry: getTokenExpiry(account.expires_in as number | undefined),
          },
          create: {
            spotifyId: profile.id as string,
            name: profile.display_name as string | undefined,
            email: profile.email as string | undefined,
            accessToken: account.access_token,
            refreshToken: account.refresh_token!,
            tokenExpiry: getTokenExpiry(account.expires_in as number | undefined),
          },
        });
      } catch (error) {
        console.error("[auth][signIn] DB upsert failed:", error);
        throw error;
      }

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
