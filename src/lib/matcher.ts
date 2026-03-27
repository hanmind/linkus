import { searchTrack, type SpotifyTrack } from "./spotify";

export interface MatchResult {
  spotifyTrack: SpotifyTrack | null;
  confidence: number;
  query: string;
}

const NOISE_PATTERNS = [
  /\(official\s*(music\s*)?video\)/i,
  /\(official\s*mv\)/i,
  /\(official\s*audio\)/i,
  /\(official\s*lyric\s*video\)/i,
  /\(lyric(s)?\s*video\)/i,
  /\(visuali[sz]er\)/i,
  /\(performance\s*video\)/i,
  /\(audio\)/i,
  /\(lyrics?\)/i,
  /\[official\s*(music\s*)?video\]/i,
  /\[mv\]/i,
  /\[m\/v\]/i,
  /\[official\s*mv\]/i,
  /\[official\s*audio\]/i,
  /\[lyrics?\]/i,
  /official\s*(music\s*)?video/i,
  /official\s*mv/i,
  /official\s*audio/i,
  /\bm\/v\b/i,
  /\bmv\b/i,
  /\blyric(s)?\s*video\b/i,
  /\bperformance\s*video\b/i,
  /\bcolor\s*coded\s*lyrics?\b/i,
  /\beng\s*sub\b/i,
  /\bhan\/rom\/eng\b/i,
  /\brom\/eng\b/i,
  /\b가사\b/i,
  /\bft\.?\s/i,
  /\bfeat\.?\s/i,
  /\(feat\.[^)]*\)/i,
  /\(ft\.[^)]*\)/i,
  /\bremaster(ed)?\b/i,
  /\bhd\b/i,
  /\b4k\b/i,
  /\b1080p\b/i,
  /\d{4}\s*ver(sion)?\.?/i,
  /\|[^|]*$/,
];

/**
 * Clean a YouTube title into a search-friendly query.
 * Attempts to extract "artist - track" if possible.
 */
export function cleanTitle(title: string): string {
  let cleaned = title.trim();

  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  // Remove content in square brackets that wasn't caught above
  cleaned = cleaned.replace(/\[[^\]]*\]/g, " ");

  // Remove content in parentheses that are clearly not part of the title
  cleaned = cleaned.replace(/\([^)]*\)/g, (match) => {
    // Keep short parenthetical content that's likely part of the title
    const inner = match.slice(1, -1).trim();
    if (inner.length <= 15 && !/official|video|audio|lyric|mv/i.test(inner)) {
      return match;
    }
    return " ";
  });

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[^\w가-힣]+|[^\w가-힣]+$/g, "").trim();

  return cleaned;
}

/**
 * Build multiple search queries with decreasing specificity.
 * Returns queries from most specific to most general.
 */
function buildSearchQueries(title: string, channelTitle: string): string[] {
  const cleaned = cleanTitle(title);
  const queries: string[] = [];

  // If the title contains a dash separator, it's likely "Artist - Track"
  const dashMatch = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    const [, artist, track] = dashMatch;
    queries.push(`artist:${artist.trim()} track:${track.trim()}`);
    queries.push(`${artist.trim()} ${track.trim()}`);
  }

  // Full cleaned title
  queries.push(cleaned);

  // Cleaned title + channel name (channel is often the artist)
  if (channelTitle && !cleaned.toLowerCase().includes(channelTitle.toLowerCase())) {
    const channelClean = channelTitle.replace(/\s*[-–]\s*topic$/i, "").trim();
    if (channelClean) {
      queries.push(`${channelClean} ${cleaned}`);
    }
  }

  return queries;
}

function stringSimilarity(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1;

  const longer = al.length > bl.length ? al : bl;
  const shorter = al.length > bl.length ? bl : al;

  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastVal = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newVal = costs[j - 1];
        if (longer[i - 1] !== shorter[j - 1]) {
          newVal = Math.min(newVal, lastVal, costs[j]) + 1;
        }
        costs[j - 1] = lastVal;
        lastVal = newVal;
      }
    }
    if (i > 0) costs[shorter.length] = lastVal;
  }

  return 1 - costs[shorter.length] / longer.length;
}

/**
 * Match a YouTube video to a Spotify track.
 * Tries multiple search strategies and picks the best result.
 */
export async function matchTrack(
  accessToken: string,
  youtubeTitle: string,
  channelTitle: string
): Promise<MatchResult> {
  const queries = buildSearchQueries(youtubeTitle, channelTitle);
  let bestMatch: SpotifyTrack | null = null;
  let bestConfidence = 0;
  let bestQuery = "";

  for (const query of queries) {
    const track = await searchTrack(accessToken, query);
    if (!track) continue;

    const trackLabel = `${track.artists.map((a) => a.name).join(" ")} ${track.name}`;
    const cleanedTitle = cleanTitle(youtubeTitle);
    const similarity = stringSimilarity(cleanedTitle, trackLabel);

    if (similarity > bestConfidence) {
      bestMatch = track;
      bestConfidence = similarity;
      bestQuery = query;
    }

    // If we got a very good match, stop searching
    if (similarity > 0.7) break;
  }

  return {
    spotifyTrack: bestConfidence >= 0.25 ? bestMatch : null,
    confidence: bestConfidence,
    query: bestQuery,
  };
}
