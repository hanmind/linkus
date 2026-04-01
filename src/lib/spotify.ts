const SPOTIFY_API_BASE = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token refresh failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  };
}

async function spotifyFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(`${SPOTIFY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export async function searchTrack(
  accessToken: string,
  query: string
): Promise<SpotifyTrack | null> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: "5",
  });

  const res = await spotifyFetch(accessToken, `/search?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  return data.tracks?.items?.[0] ?? null;
}

export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string
): Promise<{ id: string; externalUrl: string }> {
  const res = await spotifyFetch(accessToken, `/users/${userId}/playlists`, {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      public: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Spotify playlist: ${res.status}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    externalUrl: data.external_urls?.spotify ?? "",
  };
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<void> {
  // Spotify allows max 100 tracks per request
  for (let i = 0; i < trackUris.length; i += 100) {
    const batch = trackUris.slice(i, i + 100);
    const res = await spotifyFetch(
      accessToken,
      `/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        body: JSON.stringify({ uris: batch }),
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to add tracks to Spotify playlist: ${res.status}`);
    }
  }
}

export async function getSpotifyUserId(
  accessToken: string
): Promise<string> {
  const res = await spotifyFetch(accessToken, "/me");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get Spotify user: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.id;
}
