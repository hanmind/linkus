import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { db } from "./db";

const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-email",
].join(" ");

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    {
      id: "spotify",
      name: "Spotify",
      type: "oauth",
      authorization: `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(SPOTIFY_SCOPES)}`,
      token: "https://accounts.spotify.com/api/token",
      userinfo: "https://api.spotify.com/v1/me",
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      checks: ["state"],
      profile(profile) {
        return {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          image: profile.images?.[0]?.url,
        };
      },
    },
  ],
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
  pages: {
    signIn: "/",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
