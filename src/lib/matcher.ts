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
  /\b해석\b/i,
  /\b가사해석\b/i,
  /〔가사\/해석〕/i,
  /\bft\.?\s/i,
  /\bfeat\.?\s/i,
  /\(feat\.?[^)]*\)/i,
  /\(ft\.?[^)]*\)/i,
  /\bremaster(ed)?\b/i,
  /\bhd\b/i,
  /\b4k\b/i,
  /\b1080p\b/i,
  /\d{4}\s*ver(sion)?\.?/i,
  /\blive\s*(at|in)?\b[^|]*/i,
  /\bradio\s*edit\b/i,
  /\|[^|]*$/,
];

/**
 * Clean a YouTube title into a search-friendly query.
 * Support Unicode characters (Hanja, Hiragana, Katakana, etc.)
 */
export function cleanTitle(title: string): string {
  let cleaned = title.trim();

  // Handle double quotes in title
  cleaned = cleaned.replace(/"/g, " ");

  for (const pattern of NOISE_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  // Remove content in square brackets that wasn't caught above
  cleaned = cleaned.replace(/\[[^\]]*\]/g, " ");

  // Remove content in parentheses that are clearly not part of the title
  cleaned = cleaned.replace(/\([^)]*\)/g, (match) => {
    const inner = match.slice(1, -1).trim();
    // If it's short and doesn't contain noise keywords, keep it (e.g. "GEZAN")
    if (inner.length > 0 && inner.length <= 15 && !/official|video|audio|lyric|mv|가사|해석/i.test(inner)) {
      return inner;
    }
    return " ";
  });

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Remove leading/trailing punctuation but keep Unicode letters and numbers
  cleaned = cleaned.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").trim();

  return cleaned;
}

/**
 * Build multiple search queries with decreasing specificity.
 */
function buildSearchQueries(title: string, channelTitle: string): string[] {
  const cleaned = cleanTitle(title);
  const queries: string[] = [];

  // 1. Try separators (Dash, Pipe, Colon)
  const separators = /[-–—|:]/;
  const parts = cleaned.split(separators).map((p) => p.trim());

  if (parts.length >= 2) {
    const p1 = parts[0];
    const p2 = parts[1];
    queries.push(`${p1} ${p2}`);
    queries.push(`${p2} ${p1}`); // Reverse order
  }

  // 2. Channel name as Artist + Title
  const channelClean = channelTitle.replace(/\s*[-–]\s*topic$/i, "").trim();
  if (channelClean) {
    queries.push(`${channelClean} ${cleaned}`);
  }

  // 3. Full cleaned title
  queries.push(cleaned);

  return Array.from(new Set(queries));
}

/**
 * Calculate similarity based on both character-level (Levenshtein) 
 * and token-level (Jaccard) overlap.
 */
function calculateSimilarity(a: string, b: string): number {
  const normalize = (s: string) => 
    s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  
  const na = normalize(a);
  const nb = normalize(b);
  
  if (na === nb) return 1;
  if (!na || !nb) return 0;

  // 1. Token-based similarity (Jaccard)
  const tokensA = new Set(na.split(/\s+/).filter(t => t.length > 0));
  const tokensB = new Set(nb.split(/\s+/).filter(t => t.length > 0));
  
  const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
  const union = new Set([...tokensA, ...tokensB]);
  const tokenScore = intersection.size / union.size;

  // 2. Character-based similarity (Levenshtein distance)
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;

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
  const levenshteinScore = 1 - costs[shorter.length] / longer.length;

  // Pick the best of the two, or a weighted average
  // Jaccard is better for word reordering, Levenshtein for typo/small changes
  return Math.max(tokenScore, levenshteinScore);
}

/**
 * Match a YouTube video to a Spotify track.
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

  const cleanedTitle = cleanTitle(youtubeTitle);

  for (const query of queries) {
    const track = await searchTrack(accessToken, query);
    if (!track) continue;

    const trackLabel = `${track.artists.map((a) => a.name).join(" ")} ${track.name}`;
    const similarity = calculateSimilarity(cleanedTitle, trackLabel);

    if (similarity > bestConfidence) {
      bestMatch = track;
      bestConfidence = similarity;
      bestQuery = query;
    }

    if (similarity > 0.8) break;
  }

  // Threshold: back to a more balanced level
  return {
    spotifyTrack: bestConfidence >= 0.3 ? bestMatch : null,
    confidence: bestConfidence,
    query: bestQuery,
  };
}
