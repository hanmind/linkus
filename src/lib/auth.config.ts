import type { NextAuthConfig } from "next-auth";

type SpotifyUserinfoRequestContext = {
  tokens: {
    access_token?: string;
  };
  provider: {
    userinfo?: {
      url: URL;
    };
  };
};

const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private",
  "user-read-email",
].join(" ");

function getResponsePreview(body: string) {
  return body.replace(/\s+/g, " ").slice(0, 200);
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    {
      id: "spotify",
      name: "Spotify",
      type: "oauth",
      authorization: `https://accounts.spotify.com/authorize?scope=${encodeURIComponent(SPOTIFY_SCOPES)}&show_dialog=true`,
      token: {
        url: "https://accounts.spotify.com/api/token",
        async conform(response: Response) {
          const contentType = response.headers.get("content-type") ?? "";

          if (contentType.includes("application/json")) {
            return response;
          }

          const body = await response.text();
          console.error("[auth][spotify][token] Non-JSON response", {
            status: response.status,
            contentType,
            bodyPreview: getResponsePreview(body),
          });

          return Response.json(
            {
              error: "invalid_token_response",
              error_description: getResponsePreview(body),
            },
            { status: response.status || 500 }
          );
        },
      },
      userinfo: {
        url: "https://api.spotify.com/v1/me",
        async request({ tokens, provider }: SpotifyUserinfoRequestContext) {
          const response = await fetch(provider.userinfo?.url as URL, {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });

          const contentType = response.headers.get("content-type") ?? "";
          const body = await response.text();

          if (!response.ok) {
            console.error("[auth][spotify][userinfo] Request failed", {
              status: response.status,
              contentType,
              bodyPreview: getResponsePreview(body),
            });
            throw new Error(
              `Spotify userinfo request failed: ${response.status} ${getResponsePreview(body)}`
            );
          }

          if (!contentType.includes("application/json")) {
            console.error("[auth][spotify][userinfo] Non-JSON response", {
              status: response.status,
              contentType,
              bodyPreview: getResponsePreview(body),
            });
            throw new Error(
              `Spotify userinfo returned non-JSON: ${getResponsePreview(body)}`
            );
          }

          try {
            return JSON.parse(body);
          } catch (error) {
            console.error("[auth][spotify][userinfo] Failed to parse JSON", {
              contentType,
              bodyPreview: getResponsePreview(body),
            });
            throw error;
          }
        },
      },
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
  pages: {
    signIn: "/",
  },
};
