import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Trophy, User, Circle, CheckCircle, Copy, AlertCircle, TriangleAlert, ArrowUpDown, RotateCw } from 'lucide-react'; // Added RotateCw icon for retry
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip'; // Import Tooltip component

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define interfaces for API data
interface LeaderboardEntry {
    id: number;
    userId: string;
    name: string;
    carColors: string;
    frames: number;
    verifiedState: number;
    position: number;
    rank?: number;
    percent?: number;
}

// Updated LeaderboardEntryWithTrackName to include trackId
type LeaderboardEntryWithTrackName = LeaderboardEntry & { trackName: string; trackId: string };

interface UserBasicData {
    name: string;
    carColors: string;
    isVerifier: boolean | 'N/A'; // Allow 'N/A' for User ID input
}

interface AverageStats {
    avgTime: string; // Now formatted to 3 decimal places in seconds
    avgRank: string | number; // Allow number for calculation before toFixed
    avgPercent: string | number; // Allow number for calculation before toFixed
    rawAvgRank: number | undefined; // Store raw number for medal calculation
    rawAvgPercent: number | undefined; // Store raw number for medal calculation
}

interface Medal {
    icon: string;
    label: string;
    color: string; // Tailwind color class name
    type: 'mineral' | 'rank';
}

interface BestWorstStats {
    bestTime?: LeaderboardEntryWithTrackName;
    worstTime?: LeaderboardEntryWithTrackName;
    bestRank?: LeaderboardEntryWithTrackName;
    worstRank?: LeaderboardEntryWithTrackName;
    bestPercent?: LeaderboardEntryWithTrackName;
    worstPercent?: LeaderboardEntryWithTrackName;
}

// Define the structure for a track with potentially missing user data or error
interface TrackWithUserData {
    trackName: string;
    trackId: string;
    // userData can be a LeaderboardEntry, an error object with retry count, or null
    userData?: LeaderboardEntry | { error: string, retryCount: number } | null;
}


// Define the predefined tracks
const OFFICIAL_TRACKS = [
    { name: 'Summer 1', id: 'ef949bfd7492a8b329c30fac19713d9ea96256fb8bf1cdb65cb3727c0205b862' },
    { name: 'Summer 2', id: 'cf1ceacd0e3239a44afe8e4c291bd655a80ffffe559964e9a5bc5c3e21c4cafc' },
    { name: 'Summer 3', id: '456a0ac6f849ecf5d4020ade78f4e2e44f3eee3cd21b9452ff8a93e0624dbd2f' },
    { name: 'Summer 4', id: '668c209f6055c04b9f28e37127884039cb1f8710360bfe5b578955295151979f' },
    { name: 'Summer 5', id: 'b31551b1fc3cfdf3f76043b82d0c88d92451ae5246ce3db65bc3979e4912d01f' },
    { name: 'Summer 6', id: 'b6657496f1f25ab8b1599c4cc7d93b2cecebef9bd018032993f9c2f92a9f2851' },
    { name: 'Summer 7', id: 'f3d90e905743a30d4a01ff302be3ae0be38ee055cc1a3b99257752e505765c04' },
    { name: 'Winter 1', id: '94de41605004b67581f7a2a4f68c84d352b5b723a604ccb38e511f5eac9d22a9' },
    { name: 'Winter 2', id: 'f84e5f767fc5d53ae0d3ddf95dfb4a9197f361283cdb049673077b0208d12fe8' },
    { name: 'Winter 3', id: '7a0e04bfe09e1bead36ddd2f7e61d32fd6c1e55e907d60edc6ccd3e17532e1f7' },
    { name: 'Winter 4', id: '39b2d610aeed5d193f3346291fc4000ef23030e5817f471522f167b9e74ed1f5' },
    { name: 'Desert 1', id: '56a5e13736d871f92863cb60ad690e78547f459520e61285fde05bd02bd2d349' },
    { name: 'Desert 2', id: '7425633d9f77c41bbf7486fdd2b3a2ce04aa26bacc870a032929b4c7e33a8cf3' },
    { name: 'Desert 3', id: 'b84107a25d159c6544092903da12b61573971da5a6b3c917e55be30486ccaddd' },
    { name: 'Desert 4', id: '29b6343e99552c610e24a5bfefc8a240800ed151600c0dc8f5c0f3dce334d322' },
];

const COMMUNITY_TRACKS = [
    { name: '90xRESET', id: '4d0f964b159d51d6906478bbb87e1edad21b0f1eb2972af947be34f2d8c49ae9' },
    { name: 'concrete jungle', id: '0544f97453f7b0e2a310dfb0dcd331b4060ae2e9cb14ac27dc5367183dab0513' },
    { name: 'lu muvimento', id: '2ccd83e9419b6071ad9272b73e549e427b1a0f62d5305015839ae1e08fb86ce6' },
    { name: 'Re : Akina', id: 'f112ab979138b9916221cbf46329fa7377a745bdd18cd3d00b4ffd6a8a68f113' },
    { name: "Hyperion's Sanctuary", id: 'b41ac84904b60d00efa5ab8bb60f42c929c16d8ebbfe2f77126891fcddab9c1c' },
    { name: 'Opal Palace - Repolished', id: '89f1a70d0e6be8297ec340a378b890f3fed7d0e20e3ef15b5d32ef4ef7ff1701' },
    { name: 'Snow Park', id: '2978b99f058cb3a2ce6f97c435c803b8d638400532d7c79028b2ec3d5e093882' },
    { name: 'Winter Hollow', id: '2046c377ac7ec5326b263c46587f30b66ba856257ddc317a866e3e7f66a73929' },
    { name: 'Arabica', id: '1aadcef252749318227d5cd4ce61a4a71526087857104fd57697b6fc63102e8a' },
    { name: 'Clay temples', id: '773eb0b02b97a72f3e482738cda7a5292294800497e16d9366e4f4c88a6f4e2d' }, // Corrected ID
    { name: 'DESERT STALLION', id: '932da81567f2b223fa1a52d88d6db52016600c5b9df02218f06c9eb832ecddeb' },
    { name: 'Las Calles', id: '97da746d9b3ddd5a861fa8da7fcb6f6402ffa21f8f5cf61029d7a947bad76290' },
    { name: 'Last Remnant', id: '19335bb082dfde2af4f7e73e812cd54cee0039a9eadf3793efee3ae3884ce423' },
    { name: 'Malformations', id: 'bc7d29657a0eb2d0abb3b3639edcf4ade61705132c7ca1b56719a7a110096afd' },
    { name: 'Sandline Ultimatum', id: 'faed71cf26ba4d183795ecc93e3d1b39e191e51d664272b512692b0f4f323ff5' }, // Corrected ID
];


const ALL_TRACKS = [...OFFICIAL_TRACKS, ...COMMUNITY_TRACKS]; // Combined list for searching basic data

const API_BASE_URL = 'https://vps.kodub.com:43273/leaderboard';
const USER_API_BASE_URL = 'https://vps.kodub.com:43273/user'; // User specific API
const PROXY_URL = 'https://hi-rewis.maxicode.workers.dev/?url='; // Using the provided proxy
const VERSION = '0.5.0';
const MAX_RETRY_ATTEMPTS = 5; // Maximum number of auto-retries per track
const AUTO_RETRY_INTERVAL = 7000; // Interval to check for failed tracks (7 seconds)


// Function to calculate SHA-256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Helper to get medal based on percent rank
const getMedal = (percent: number | undefined): Medal | null => {
  if (percent === undefined || isNaN(percent)) return null;
  // Using standard Tailwind color names
  if (percent <= 0.005) return { icon: '♦', label: 'Diamond', color: 'cyan-400', type: 'mineral' };
  if (percent <= 0.5) return { icon: '♦', label: 'Emerald', color: 'green-500', type: 'mineral' };
  if (percent <= 5) return { icon: '♦', label: 'Gold', color: 'yellow-400', type: 'mineral' }; // Using amber for gold
  if (percent <= 15) return { icon: '♦', label: 'Silver', color: 'gray-400', type: 'mineral' }; // Using gray for silver
  if (percent <= 25) return { icon: '♦', label: 'Bronze', color: 'red-700', type: 'mineral' }; // Using darker amber for bronze
  return null;
};

// Helper to get medal based on position rank
const getPosMedal = (position: number | undefined): Medal | null => {
  if (position === undefined || isNaN(position) || position <= 0) return null;
  // Using standard Tailwind color names
  if (position === 1) return { icon: '✦', label: 'WR', color: 'black', type: 'rank' }; // Black is standard
  // Changed Podium color to purple-300
  if (position <= 5) return { icon: '✦', label: 'Podium', color: 'purple-300', type: 'rank' };
  return null;
};

// Component for the copy popup animation
const CopyPopup = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm px-4 py-2 rounded-md shadow-lg z-50"
  >
    Copied: {text}
  </motion.div>
);

const UserViewer = () => {
  const [userInput, setUserInput] = useState('');
  const [userInputType, setUserInputType] = useState<'userid' | 'usertoken'>('userid');
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null); // The actual user ID hash
  const [basicUserData, setBasicUserData] = useState<UserBasicData | null>(null); // User's basic info
  // State to store fetched user entries, indexed by track ID for quick lookup
  // This map will now store LeaderboardEntry | { error: string, retryCount: number } | null
  const [userEntriesByTrack, setUserEntriesByTrack] = useState<Map<string, LeaderboardEntry | { error: string, retryCount: number } | null>>(() => new Map());

  // Keep track of tracks where user has entries for averages/best/worst/medals
  // These lists will only contain successful LeaderboardEntryWithTrackName objects
  const [officialTracksWithEntries, setOfficialTracksWithEntries] = useState<LeaderboardEntryWithTrackName[]>([]);
  const [communityTracksWithEntries, setCommunityTracksWithEntries] = useState<LeaderboardEntryWithTrackName[]>([]);


  const [officialSortBy, setOfficialSortBy] = useState<'trackOrder' | 'lowestPercent' | 'highestRank' | 'fastestTime' | 'alphabetical'>('trackOrder'); // Reduced sort options
  const [communitySortBy, setCommunitySortBy] = useState<'trackOrder' | 'lowestPercent' | 'highestRank' | 'fastestTime' | 'alphabetical'>('trackOrder'); // Reduced sort options

  const [reverseOfficialSort, setReverseOfficialSort] = useState(false); // State for reverse button
  const [reverseCommunitySort, setReverseCommunitySort] = useState(false); // State for reverse button


  const [officialAverageStats, setOfficialAverageStats] = useState<AverageStats | null>(null);
  const [communityAverageStats, setCommunityAverageStats] = useState<AverageStats | null>(null);
  const [overallAverageStats, setOverallAverageStats] = useState<AverageStats | null>(null);

  // State to store tracks per medal type, not just counts
  const [medalTracks, setMedalTracks] = useState<{ [key: string]: LeaderboardEntryWithTrackName[] }>({});
  // State to track which medal box is hovered to show tracks
  const [hoveredMedal, setHoveredMedal] = useState<string | null>(null);

  // New state for best/worst stats
  const [officialBestWorst, setOfficialBestWorst] = useState<BestWorstStats>({});
  const [communityBestWorst, setCommunityBestWorst] = useState<BestWorstStats>({});
  const [overallBestWorst, setOverallBestWorst] = useState<BestWorstStats>({});


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // General error message

  const [copiedText, setCopiedText] = useState<string | null>(null);
  // Corrected initialization: Initialize useRef with null
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [displayMode, setDisplayMode] = useState<'input' | 'allTrackStats'>('input');

  // Helper to format frames into time string (frames are in milliseconds)
  const formatTime = (frames: number | undefined) => {
    if (typeof frames !== 'number' || isNaN(frames) || frames < 0) return 'N/A';

    // Total milliseconds
    const totalMilliseconds = frames;

    // Calculate hours, minutes, seconds, and milliseconds
    const ms = totalMilliseconds % 1000;
    const totalSeconds = Math.floor(totalMilliseconds / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    // Always include milliseconds with 3 digits
    const formattedTime = `${h > 0 ? `${h}h ` : ''}${m > 0 || h > 0 ? `${m}m ` : ''}${s}.${ms.toString().padStart(3, '0')}s`;

    return formattedTime;
  };


  // Function to fetch user's entry for a specific track with retry logic
  const fetchUserTrackEntry = useCallback(async (userId: string, trackId: string, onlyVerified: boolean, retries = 3, delay = 500): Promise<LeaderboardEntry | { error: string, retryCount: number } | null> => { // Updated return type to include retryCount
      for (let i = 0; i <= retries; i++) {
          try {
              const userFetchUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=0&amount=1&onlyVerified=${onlyVerified}&userTokenHash=${userId}`)}`;
              const userResponse = await fetch(userFetchUrl);

              if (!userResponse.ok) {
                  // If it's a 404, the user just doesn't have an entry, which is not an error for this logic.
                  if (userResponse.status === 404) {
                       console.warn(`User not found on track ${trackId}.`);
                       return null; // Return null if user not found on this track
                  }
                  // For other non-OK responses, throw an error to trigger retry
                  throw new Error(`HTTP error! status: ${userResponse.status}`);
              }

              const userData: { total: number; userEntry: LeaderboardEntry | null } = await userResponse.json();

              if (userData.userEntry) {
                  const rank = userData.userEntry.position;
                  const totalEntries = typeof userData.total === 'number' ? userData.total : 0;
                  const percent = totalEntries > 0 && typeof rank === 'number' ? (rank / totalEntries) * 100 : undefined;

                  return {
                      ...userData.userEntry,
                      rank: rank,
                      percent: percent
                  };
              } else {
                  // userEntry is null if user is not on the leaderboard, even if the request was 200 OK
                  return null;
              }

          } catch (err: any) {
              console.error(`Attempt ${i + 1} failed for track ${trackId}:`, err);
              if (i < retries) {
                  await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i))); // Exponential backoff delay
              } else {
                  // After last retry, return error indicator with retryCount
                  console.error(`Max retries reached for track ${trackId}.`);
                  return { error: err.message || 'Failed to load data', retryCount: i + 1 }; // Include retryCount in the returned error object
              }
          }
      }
      // Should not be reached if retries > 0, but as a fallback
      return { error: 'Failed to load data after retries', retryCount: retries + 1 }; // Include retryCount in the fallback
  }, [PROXY_URL, API_BASE_URL, VERSION]); // Added dependencies


  // Function to fetch user's basic data (if using token)
  const fetchUserBasicData = useCallback(async (userToken: string): Promise<UserBasicData | null> => {
      try {
          const userApiUrl = `${PROXY_URL}${encodeURIComponent(USER_API_BASE_URL + `?version=${VERSION}&userToken=${userToken}`)}`;
          const response = await fetch(userApiUrl);

          if (!response.ok) {
              throw new Error(`Failed to fetch user basic data: ${response.status}`);
          }
          const data: UserBasicData = await response.json();
          return data;
      } catch (err: any) {
          console.error("Error fetching user basic data:", err);
          setError(err.message || 'An error occurred while fetching user basic data.');
          return null;
      }
  }, [PROXY_URL, USER_API_BASE_URL, VERSION]);

  // Helper function to calculate averages from a list of entries
  const calculateAverages = (entries: LeaderboardEntry[]): AverageStats | null => {
      if (entries.length === 0) return null;

      const totalFrames = entries.reduce((sum, entry) => sum + entry.frames, 0);
      // Only include entries with a valid rank in average rank calculation
      const rankedEntries = entries.filter(entry => entry.rank !== undefined && typeof entry.rank === 'number' && !isNaN(entry.rank));
      const totalRanks = rankedEntries.reduce((sum, entry) => sum + entry.rank!, 0);

       // Only include entries with a valid percent in average percent calculation
      const percentedEntries = entries.filter(entry => entry.percent !== undefined && typeof entry.percent === 'number' && !isNaN(entry.percent));
      const totalPercents = percentedEntries.reduce((sum, entry) => sum + (entry.percent || 0), 0);

      const rawAvgRank = rankedEntries.length > 0 ? totalRanks / rankedEntries.length : undefined;
      const rawAvgPercent = percentedEntries.length > 0 ? totalPercents / percentedEntries.length : undefined;

      // Calculate average frames and convert to seconds
      const rawAvgFrames = totalFrames / entries.length;
      const avgSeconds = rawAvgFrames / 1000;

      // Format average time to 3 decimal places for seconds
      const avgTime = `${avgSeconds.toFixed(3)}s`;

      // Increased decimal places for average percent
      const avgRank = rawAvgRank !== undefined ? rawAvgRank.toFixed(2) : 'N/A';
      const avgPercent = rawAvgPercent !== undefined ? rawAvgPercent.toFixed(4) + '%' : 'N/A'; // Increased to 4 decimal places

      return { avgTime, avgRank, avgPercent, rawAvgRank, rawAvgPercent };
  };

    // Helper function to find best and worst stats from a list of entries
    const findBestWorstStats = (entries: LeaderboardEntryWithTrackName[]): BestWorstStats => {
        if (entries.length === 0) return {};

        // Filter out entries without valid frames before finding best/worst time
        const entriesWithTime = entries.filter(entry => typeof entry.frames === 'number' && !isNaN(entry.frames) && entry.frames >= 0);

        let bestTime = entriesWithTime.length > 0 ? entriesWithTime[0] : undefined;
        let worstTime = entriesWithTime.length > 0 ? entriesWithTime[0] : undefined;
        let bestRank = entries.find(entry => entry.rank !== undefined && typeof entry.rank === 'number' && !isNaN(entry.rank)) || undefined;
        let worstRank = entries.find(entry => entry.rank !== undefined && typeof entry.rank === 'number' && !isNaN(entry.rank)) || undefined;
        let bestPercent = entries.find(entry => entry.percent !== undefined && typeof entry.percent === 'number' && !isNaN(entry.percent)) || undefined;
        let worstPercent = entries.find(entry => entry.percent !== undefined && typeof entry.percent === 'number' && !isNaN(entry.percent)) || undefined;

        entriesWithTime.forEach(entry => {
            // Time (lower is better)
            if (entry.frames < bestTime!.frames) bestTime = entry; // Use non-null assertion as we filtered for entriesWithTime
            if (entry.frames > worstTime!.frames) worstTime = entry; // Use non-null assertion
        });

         entries.forEach(entry => {
            // Rank (lower is better) - only compare if rank is valid
            if (entry.rank !== undefined && typeof entry.rank === 'number' && !isNaN(entry.rank)) {
                if (!bestRank || entry.rank < bestRank.rank!) bestRank = entry;
                if (!worstRank || entry.rank > worstRank.rank!) worstRank = entry;
            }

            // Percent (lower is better) - only compare if percent is valid
            if (entry.percent !== undefined && typeof entry.percent === 'number' && !isNaN(entry.percent)) {
                if (!bestPercent || entry.percent < bestPercent.percent!) bestPercent = entry;
                if (!worstPercent || entry.percent > worstPercent.percent!) worstPercent = entry;
            }
        });


        return {
            bestTime,
            worstTime,
            bestRank,
            worstRank,
            bestPercent,
            worstPercent,
        };
    };


  // Helper function to group entries by medal type
  const groupEntriesByMedal = (entries: LeaderboardEntryWithTrackName[]): { [key: string]: LeaderboardEntryWithTrackName[] } => {
      const medalMap: { [key: string]: LeaderboardEntryWithTrackName[] } = {};
      // Filter for entries that actually have a medal
      const medalEligibleEntries = entries.filter(entry => getMedal(entry.percent) || getPosMedal(entry.position));

      medalEligibleEntries.forEach(entry => {
          const percentMedal = getMedal(entry.percent);
          if (percentMedal) {
              if (!medalMap[percentMedal.label]) {
                  medalMap[percentMedal.label] = [];
              }
              medalMap[percentMedal.label].push(entry);
          }
          const posMedal = getPosMedal(entry.position);
          if (posMedal) {
             // Avoid adding the same entry twice if it gets both a position and percent medal
             if (!medalMap[posMedal.label]) {
                 medalMap[posMedal.label] = [];
             }
             // Check if the entry is already added under this medal label
             if (!medalMap[posMedal.label].some(existingEntry => existingEntry.id === entry.id && existingEntry.trackName === entry.trackName)) {
                 medalMap[posMedal.label].push(entry);
             }
          }
      });
      return medalMap;
  };

  // Helper to get a medal object by its label for consistent icon/color display
  const getMedalByLabel = (label: string): Medal | null => {
      switch (label) {
          case 'WR': return getPosMedal(1);
          case 'Podium': return getPosMedal(2); // Using 2 as representative rank for Podium (ranks 2-5)
          case 'Diamond': return getMedal(0.001); // Using a value within the range
          case 'Emerald': return getMedal(0.1); // Using a value within the range
          case 'Gold': return getMedal(1); // Using a value within the range
          case 'Silver': return getMedal(10); // Using a value within the range
          case 'Bronze': return getMedal(20); // Using a value within the range
          default: return null;
      }
  };

    // Function to scroll to a specific track entry
    const scrollToTrack = useCallback((trackId: string) => {
        const targetElement = document.getElementById(`track-${trackId}`);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);


  // Function to handle retrying a single track
  const handleRetryTrack = useCallback(async (trackId: string, trackName: string, isAutoRetry: boolean = false) => {
       if (!resolvedUserId) return; // Only retry if a user is loaded

       // Get current entry state to determine retry count
       const currentEntry = userEntriesByTrack.get(trackId);
       const currentRetryCount = (currentEntry && typeof currentEntry === 'object' && 'error' in currentEntry) ? currentEntry.retryCount : 0;

       // If this is an auto-retry and we've reached the max attempts, stop
       if (isAutoRetry && currentRetryCount >= MAX_RETRY_ATTEMPTS) {
           console.log(`Max auto-retries reached for track ${trackName}. Stopping auto-retry.`);
           return;
       }


       // Set loading state for this specific track, incrementing retry count for errors
       setUserEntriesByTrack(prevMap => {
           const newMap = new Map(prevMap);
           const existingEntry = newMap.get(trackId);
           const newRetryCount = (existingEntry && typeof existingEntry === 'object' && 'error' in existingEntry) ? existingEntry.retryCount + 1 : 1;
           newMap.set(trackId, { error: 'Retrying...', retryCount: newRetryCount }); // Indicate retrying and update count
           return newMap;
       });

       // Clear the general error message if this was the only failed track (excluding the one being retried)
       const failedTracksBeforeRetry = Array.from(userEntriesByTrack.entries())
           .filter(([id, entryOrError]) =>
               id !== trackId && // Exclude the current track
               entryOrError &&
               typeof entryOrError === 'object' &&
               'error' in entryOrError &&
               entryOrError.error !== 'Retrying...' // Exclude tracks already marked as retrying
           );
       if (error && failedTracksBeforeRetry.length === 0) {
           setError(null);
       }


       // Fetch the track entry with retry logic (internal retries within fetchUserTrackEntry)
       const entry = await fetchUserTrackEntry(resolvedUserId, trackId, false);

       // Update the map with the new result
       setUserEntriesByTrack(prevMap => {
            const newMap = new Map(prevMap);
            // If the new entry is still an error, preserve the incremented retry count
            if (entry && typeof entry === 'object' && 'error' in entry) {
                 const existingErrorEntry = newMap.get(trackId);
                 const retryCount = (existingErrorEntry && typeof existingErrorEntry === 'object' && 'error' in existingErrorEntry) ? existingErrorEntry.retryCount : 0;
                 newMap.set(trackId, { error: entry.error, retryCount: retryCount }); // Keep the incremented count
            } else {
                 newMap.set(trackId, entry); // Update with successful entry or null
            }


            // Re-calculate averages, best/worst, and medals if a successful entry was added or an error was resolved
            // Filter for successful entries only for these calculations
            const allTracksWithUserData: TrackWithUserData[] = ALL_TRACKS.map(track => ({
                trackName: track.name,
                trackId: track.id,
                userData: newMap.get(track.id) as LeaderboardEntry | { error: string, retryCount: number } | null
            }));

            const successfulEntries = allTracksWithUserData.filter(t =>
                t.userData !== null && !(typeof t.userData === 'object' && 'error' in t.userData)
            ).map(t => ({
                ...t.userData as LeaderboardEntry, // Spread the LeaderboardEntry properties
                trackName: t.trackName, // Add trackName
                trackId: t.trackId // Add trackId
            })) as LeaderboardEntryWithTrackName[]; // Cast the result to the correct type


            const updatedOfficial = successfulEntries.filter(entry => OFFICIAL_TRACKS.some(ot => ot.id === entry.trackId));
            const updatedCommunity = successfulEntries.filter(entry => COMMUNITY_TRACKS.some(ct => ct.id === entry.trackId));


            setOfficialTracksWithEntries(updatedOfficial);
            setCommunityTracksWithEntries(updatedCommunity);
            setOfficialAverageStats(calculateAverages(updatedOfficial));
            setCommunityAverageStats(calculateAverages(updatedCommunity));
            setOverallAverageStats(calculateAverages([...updatedOfficial, ...updatedCommunity]));
            setMedalTracks(groupEntriesByMedal([...updatedOfficial, ...updatedCommunity]));
            setOfficialBestWorst(findBestWorstStats(updatedOfficial));
            setCommunityBestWorst(findBestWorstStats(updatedCommunity));
            setOverallBestWorst(findBestWorstStats([...updatedOfficial, ...updatedCommunity]));

            return newMap;
       });

        // Re-evaluate general error message after updating the map
        const failedTracksAfterRetry = Array.from(userEntriesByTrack.values()).some(entry => entry && typeof entry === 'object' && 'error' in entry && entry.error !== 'Retrying...'); // Exclude 'Retrying...' from the count
        if (failedTracksAfterRetry) {
            setError('Some track data failed to load. You can try retrying individual tracks.');
        } else {
            setError(null); // Clear general error if all retries were successful
        }

  }, [resolvedUserId, fetchUserTrackEntry, userEntriesByTrack, error, ALL_TRACKS, OFFICIAL_TRACKS, COMMUNITY_TRACKS, calculateAverages, groupEntriesByMedal, findBestWorstStats]); // Added dependencies


  // Function to fetch user stats for all tracks
  const fetchAllUserTrackStats = useCallback(async (userId: string) => {
      setLoading(true);
      setError(null); // Clear general error at the start
      setUserEntriesByTrack(new Map()); // Clear previous entries map
      setOfficialTracksWithEntries([]); // Clear previous tracks with entries
      setCommunityTracksWithEntries([]); // Clear previous tracks with entries
      setOfficialAverageStats(null);
      setCommunityAverageStats(null);
      setOverallAverageStats(null);
      setMedalTracks({}); // Clear previous medal data
      setHoveredMedal(null); // Clear hovered medal state
      setOfficialBestWorst({}); // Clear best/worst stats
      setCommunityBestWorst({});
      setOverallBestWorst({});

      const fetchPromises = ALL_TRACKS.map((track, index) =>
          // Reduced the delay before starting the fetch for each track
          new Promise(resolve => setTimeout(resolve, index * 20)).then(() => // Reduced delay to 20ms per track
              fetchUserTrackEntry(userId, track.id, false)
                  .then(entry => ({ trackId: track.id, trackName: track.name, result: entry })) // Wrap result with track info
                  .catch(error => ({ trackId: track.id, trackName: track.name, error: error.message || 'Unknown error' })) // Catch any unexpected errors
          )
      );

      const results = await Promise.allSettled(fetchPromises); // Use allSettled

      const fetchedEntriesMap = new Map<string, LeaderboardEntry | { error: string, retryCount: number } | null>(); // Map can now store errors or null
      const officialTracksWithEntries: LeaderboardEntryWithTrackName[] = [];
      const communityTracksWithEntries: LeaderboardEntryWithTrackName[] = [];

      results.forEach(result => {
          let trackId: string;
          let trackName: string;
          let entryOrError: LeaderboardEntry | { error: string, retryCount: number } | null = null; // Initialize entryOrError

          if (result.status === 'fulfilled') {
              trackId = result.value.trackId;
              trackName = result.value.trackName;
              // Access the actual result from the fulfilled value
              // Check if result.value exists, is an object, and has the 'result' property
              if (result.value && typeof result.value === 'object' && 'result' in result.value) {
                   entryOrError = result.value.result;

                   // If it's a specific error object from fetchUserTrackEntry, initialize retry count
                   if (entryOrError && typeof entryOrError === 'object' && 'error' in entryOrError) {
                        // Ensure retryCount is included even if the error came from fetchUserTrackEntry's catch
                        fetchedEntriesMap.set(trackId, { error: entryOrError.error, retryCount: (entryOrError as any).retryCount || 0 }); // Use (entryOrError as any).retryCount to access it if present, fallback to 0
                   } else if (entryOrError !== null) {
                       // It's a successful entry (not null)
                       fetchedEntriesMap.set(trackId, entryOrError);
                       // Correctly construct LeaderboardEntryWithTrackName
                       const trackWithEntry: LeaderboardEntryWithTrackName = { trackName: trackName, trackId: trackId, ...entryOrError };
                       if (OFFICIAL_TRACKS.some(ot => ot.id === trackId)) {
                           officialTracksWithEntries.push(trackWithEntry);
                       } else {
                           communityTracksWithEntries.push(trackWithEntry);
                       }
                   } else {
                        // entryOrError is null, meaning user has no entry on this track
                        fetchedEntriesMap.set(trackId, null); // Store null explicitly
                   }
              } else {
                   // This case implies result.value was fulfilled but didn't have the expected 'result' property,
                   // or was the inner error structure itself. Treat as a fetch error.
                   console.error(`Fulfilled promise value did not have expected 'result' structure for track ${trackName}. Value:`, result.value);
                   fetchedEntriesMap.set(trackId, { error: 'Unexpected data structure', retryCount: 0 });
              }
          } else { // result.status === 'rejected'
              // Access reason for rejected promises
              trackId = result.reason.trackId;
              trackName = result.reason.trackName;
               console.error(`Promise rejected for track ${trackName}:`, result.reason.error);
               // Initialize retry count for unexpected errors
               // FIX: Ensure rejected promises also set retryCount to 0
               // The reason from Promise.allSettled might not have retryCount, add it here.
               fetchedEntriesMap.set(trackId, { error: result.reason.error || 'Unknown error', retryCount: 0 });
          }
      });


      setUserEntriesByTrack(fetchedEntriesMap); // Store the map with entries and errors
      setOfficialTracksWithEntries(officialTracksWithEntries); // These lists only contain successful entries for averages etc.
      setCommunityTracksWithEntries(communityTracksWithEntries);


      // Calculate and set individual and overall averages using only tracks with entries
      setOfficialAverageStats(calculateAverages(officialTracksWithEntries));
      setCommunityAverageStats(calculateAverages(communityTracksWithEntries));
      setOverallAverageStats(calculateAverages([...officialTracksWithEntries, ...communityTracksWithEntries]));

      // Group entries by medal and set the state using only tracks with entries
      setMedalTracks(groupEntriesByMedal([...officialTracksWithEntries, ...communityTracksWithEntries]));

      // Calculate and set best/worst stats using only tracks with entries
      setOfficialBestWorst(findBestWorstStats(officialTracksWithEntries));
      setCommunityBestWorst(findBestWorstStats(communityTracksWithEntries));
      setOverallBestWorst(findBestWorstStats([...officialTracksWithEntries, ...communityTracksWithEntries]));


      setDisplayMode('allTrackStats'); // Switch display mode

      // Check if any tracks failed to load and set a general error message if needed
      const failedTracks = Array.from(fetchedEntriesMap.values()).some(entry => entry && typeof entry === 'object' && 'error' in entry);
      if (failedTracks) {
          setError('Some track data failed to load. Auto-retrying failed tracks...');
      } else {
          setError(null); // Clear general error if all retries were successful
      }


      setLoading(false);

  }, [fetchUserTrackEntry, calculateAverages, groupEntriesByMedal, findBestWorstStats, ALL_TRACKS, OFFICIAL_TRACKS, COMMUNITY_TRACKS, basicUserData]); // Added ALL_TRACKS etc. to dependencies


  // Combined function to process input and trigger appropriate data fetching
  const processUserInputAndFetchData = useCallback(async () => {
      setError(null); // Clear error at the start
      setResolvedUserId(null); // Clear previous resolved user ID
      setBasicUserData(null); // Clear previous basic user data
      setUserEntriesByTrack(new Map()); // Clear previous entries map
      setOfficialTracksWithEntries([]); // Clear previous tracks with entries
      setCommunityTracksWithEntries([]); // Clear previous tracks with entries
      setOfficialAverageStats(null);
      setCommunityAverageStats(null);
      setOverallAverageStats(null);
      setMedalTracks({}); // Clear previous medal data
      setHoveredMedal(null); // Clear hovered medal state
      setOfficialBestWorst({}); // Clear best/worst stats
      setCommunityBestWorst({});
      setOverallBestWorst({});
      setDisplayMode('input'); // Reset display mode initially

      if (!userInput) {
        setError('Please enter a User ID or User Token.');
        return;
      }

      setLoading(true);
      let targetUserId: string | null = null;
      let processingError: string | null = null;
      let foundBasicData: UserBasicData | null = null; // Variable to hold found basic data

      // Step 1: Resolve User ID and fetch basic data (name, carColors, isVerifier)
      if (userInputType === 'userid') {
        targetUserId = userInput;
        setBasicUserData({
             name: 'Searching for user...', // Set a temporary state while searching
             carColors: '',
             isVerifier: 'N/A', // isVerifier cannot be determined from User ID
        });

        // Iterate through ALL_TRACKS to find the user's basic data
        // Added a small delay between checks to be less aggressive
        for (const track of ALL_TRACKS) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Add a small delay
            try {
                // First call: Get user's position on using userTokenHash
                const firstCallUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${track.id}&skip=0&amount=1&onlyVerified=false&userTokenHash=${targetUserId}`)}`;
                const firstResponse = await fetch(firstCallUrl);

                if (!firstResponse.ok) {
                     console.warn(`First call failed or user not found on track ${track.name}: ${firstResponse.status}`);
                     continue; // Continue to the next track if user not found on this one
                }

                const firstData: { total: number; userEntry: LeaderboardEntry | null } = await firstResponse.json();

                if (firstData.userEntry && firstData.userEntry.position !== undefined && firstData.userEntry.position > 0) {
                    const userPosition = firstData.userEntry.position;
                    const skipAmount = userPosition > 1 ? userPosition - 1 : 0; // Calculate skip amount

                    // Second call: Get the user's entry at their position to get name/colors
                    const secondCallUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${track.id}&skip=${skipAmount}&amount=1&onlyVerified=false`)}`; // Removed userTokenHash here
                    const secondResponse = await fetch(secondCallUrl);

                    if (!secondResponse.ok) {
                        console.warn(`Second call failed for track ${track.name} at skip ${skipAmount} (getting entry details): ${secondResponse.status}`);
                        continue; // Continue to the next track on error
                    } else {
                        const secondData: { entries: LeaderboardEntry[] } = await secondResponse.json();

                        if (secondData.entries && secondData.entries.length > 0 && secondData.entries[0].userId === targetUserId) {
                            // Found the user's entry in the entries array - use this data
                            foundBasicData = {
                                name: secondData.entries[0].name,
                                carColors: secondData.entries[0].carColors,
                                isVerifier: 'N/A' // Cannot determine isVerifier from User ID
                            };
                            break; // Stop searching once data is found
                        } else {
                             console.warn(`User entry not found in second call entries array for track ${track.name} at skip ${skipAmount}.`);
                             continue; // Continue to the next track
                        }
                    }
                } else {
                     console.warn(`User entry not found or no position in first call for track ${track.name}.`);
                     continue; // Continue to the next track
                }
            } catch (e: any) {
                 console.error(`Network Error during leaderboard lookup for track ${track.name}:`, e);
                 // Continue to the next track on network error
                 continue;
            }
        }

        // After iterating through all tracks, set the basic user data
        if (foundBasicData) {
            setBasicUserData(foundBasicData);
        } else {
             // If no entry was found on any track
             setBasicUserData({
                  name: 'User Not Found on any tracks',
                  carColors: '',
                  isVerifier: 'N/A'
             });
             // Set an error if the user wasn't found on any track
             processingError = 'User ID not found on any official or community tracks.';
        }


      } else if (userInputType === 'usertoken') {
        try {
          targetUserId = await sha256(userInput);
          const fetchedBasicData = await fetchUserBasicData(userInput); // Fetch basic data using the token
           // Set basic user data from fetched data
           setBasicUserData(fetchedBasicData); // Corrected typo
           if (!fetchedBasicData || !fetchedBasicData.name) {
               // If basic data fetch was successful but returned no name (e.e., token invalid or user doesn't exist via token API)
               processingError = 'Could not retrieve user information for the provided User Token.';
               setBasicUserData({
                   name: 'User Info Unavailable (Token Lookup Failed)',
                   carColors: '',
                   isVerifier: false, // isVerifier will be false if token lookup fails
               });
           }
        } catch (e: any) {
          processingError = 'Failed to process user token or fetch basic data.';
          console.error('Token processing error:', e);
           // Set placeholder basic data on token error
           setBasicUserData({
                name: 'User Info Unavailable (Token Error)',
                carColors: '',
                isVerifier: false, // isVerifier will be false if token lookup fails
           });
        }
      }

      // If there was a processing error, set the error state and stop
      if (processingError) {
          setError(processingError);
          setLoading(false);
          return;
      }

      // If we successfully determined a targetUserId
      if (targetUserId) {
          setResolvedUserId(targetUserId); // Store the resolved user ID

          // Step 2: Fetch stats for all tracks
          // This call remains the same, as it fetches all entries for the resolved user ID
          fetchAllUserTrackStats(targetUserId);

      } else {
          // This case should ideally be covered by processingError now, but keeping as a safeguard
          setError(processingError || 'Could not resolve user ID from the provided input.');
          setLoading(false);
      }

  }, [userInput, userInputType, fetchUserBasicData, fetchAllUserTrackStats, ALL_TRACKS, PROXY_URL, API_BASE_URL, VERSION]); // Added ALL_TRACKS etc. to dependencies


    // Effect to set basic user data to 'not found' if no entries are returned after loading
    // This effect is less critical now that basic data is fetched upfront for User ID,
    // but kept as a fallback in case of unexpected API behavior or if the initial lookup fails
    // but track entries are somehow still returned (unlikely but safer).
    useEffect(() => {
        // Only run if resolvedUserId is set, basicUserData is not null/undefined,
        // loading is finished, and no entries were returned in the main fetch.
        // Refined the condition to explicitly check basicUserData != null and use optional chaining for name
        if (resolvedUserId && basicUserData != null && (basicUserData.name === 'Searching for user...' || basicUserData.name === 'Fetching Name...') && !loading && officialTracksWithEntries.length === 0 && communityTracksWithEntries.length === 0) {
             setBasicUserData({
                 name: 'User Not Found on any tracks',
                 carColors: '',
                 isVerifier: 'N/A',
             });
             // Also set an error if no tracks were found after a successful ID resolution
             setError('User ID found, but no entries were found on any tracks.');
        }
    }, [resolvedUserId, basicUserData, officialTracksWithEntries, communityTracksWithEntries, loading]); // Depend on these states

    // Effect for auto-retrying failed tracks
    useEffect(() => {
        if (!resolvedUserId) return; // Only run if a user is loaded

        const retryInterval = setInterval(() => {
            console.log("Checking for failed tracks to retry...");
            const failedTracksToRetry = Array.from(userEntriesByTrack.entries())
                .filter(([trackId, entryOrError]) =>
                    entryOrError &&
                    typeof entryOrError === 'object' &&
                    'error' in entryOrError &&
                    entryOrError.error !== 'Retrying...' && // Don't retry tracks already marked as retrying
                    entryOrError.retryCount < MAX_RETRY_ATTEMPTS // Only retry if retry count is below max
                );

            if (failedTracksToRetry.length > 0) {
                console.log(`Found ${failedTracksToRetry.length} failed tracks to auto-retry.`);
                failedTracksToRetry.forEach(([trackId, entryOrError]) => {
                    // Add a slightly offset random delay between retries
                     const delay = Math.random() * 2000 + 500; // Random delay between 500ms and 2500ms
                     setTimeout(() => {
                         // Find the track name from ALL_TRACKS using the trackId
                         const trackName = ALL_TRACKS.find(t => t.id === trackId)?.name || trackId;
                         handleRetryTrack(trackId, trackName, true); // Pass true for isAutoRetry
                     }, delay);
                });
            } else {
                console.log("No failed tracks found to auto-retry.");
            }

        }, AUTO_RETRY_INTERVAL); // Check every 7 seconds for failed tracks

        // Cleanup function to clear the interval when the component unmounts or dependencies change
        return () => clearInterval(retryInterval);

    }, [userEntriesByTrack, resolvedUserId, handleRetryTrack, ALL_TRACKS]); // Depend on userEntriesByTrack, resolvedUserId, handleRetryTrack, and ALL_TRACKS


  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    if (!navigator.clipboard) {
      console.warn('Clipboard API is not available in this context.');
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedText(text);
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => setCopiedText(null), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  // Function to display car colors with copy functionality and tooltips
  const displayCarColors = (carColors: string) => {
    if (!carColors) return <span className="text-gray-400">No Color Data</span>;
    const colors = carColors.match(/.{1,6}/g);
    if (!colors) return <span className="text-gray-400">Invalid Color Data</span>;
    return (
      <div className="flex gap-2 items-center flex-wrap justify-start">
        {colors.map((c, i) => {
          const hex = `#${c.padEnd(6, '0')}`;
          // Use a unique ID for each tooltip based on index and hex code
          const tooltipId = `color-tooltip-${i}-${hex.replace('#', '')}`;
          return (
            <motion.div
              key={i}
              style={{ backgroundColor: hex, cursor: 'pointer' }}
              className="w-4 h-4 rounded-full border border-gray-600" // Added border for visibility on light backgrounds
              title={hex} // Keep title for fallback
              onClick={() => copyToClipboard(hex)}
              whileHover={{ scale: 1.2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              data-tooltip-id={tooltipId} // Add data-tooltip-id
              data-tooltip-content={hex} // Add data-tooltip-content
            />
            );
        })}
        {/* Add Tooltip components for the color circles */}
        {colors.map((c, i) => {
             const hex = `#${c.padEnd(6, '0')}`;
             const tooltipId = `color-tooltip-${i}-${hex.replace('#', '')}`;
             return <Tooltip key={tooltipId} id={tooltipId} place="top" className="!text-xs !bg-gray-700 !text-white" />;
        })}

        <Button
          variant="link"
          size="sm"
          onClick={() => copyToClipboard(carColors)}
          className="text-blue-400 font-mono text-xs truncate p-0 ml-1"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  // Component to display Verified State icon
  const VerifiedStateIcon = ({ verifiedState }: { verifiedState: number | undefined }) => {
    if (verifiedState === undefined) return null; // Don't show anything if state is undefined
    const icons = [
      <Tooltip key="unverified-tip" id="unverified-tip"><span className="text-xs">Unverified</span></Tooltip>,
      <Tooltip key="verified-tip" id="verified-tip"><span className="text-xs">Verified</span></Tooltip>,
      <Tooltip key="unknown-tip" id="unknown-tip"><span className="text-xs">Unknown Verification State</span></Tooltip>,
    ];
    const iconElements = [
      <Circle data-tooltip-id="unverified-tip" className="w-4 h-4 text-gray-400" key="unverified" />,
      <CheckCircle data-tooltip-id="verified-tip" className="w-4 h-4 text-green-500" key="verified" />,
      <Circle data-tooltip-id="unknown-tip" className="w-4 h-4 text-gray-400" key="unknown" />, // Default or other states
    ];
     // Use verifiedState to index, with a fallback to index 2 (unknown)
    return (
        <>
            {icons[verifiedState] || icons[2]}
            {iconElements[verifiedState] || iconElements[2]}
        </>
    );
  };

  // Memoized sorted track stats for display (includes tracks with and without entries)
  const sortedTrackDisplayStats = useMemo(() => {
      // Combine all predefined tracks with their user data (if available from the map)
      const allTracksWithUserData: TrackWithUserData[] = ALL_TRACKS.map(track => ({
          trackName: track.name,
          trackId: track.id,
          userData: userEntriesByTrack.has(track.id) ? userEntriesByTrack.get(track.id) : undefined, // Get user data, error, or null from the map
      }));

      // Separate into official and community for sorting
      const officialDisplayStats = allTracksWithUserData.filter(track => OFFICIAL_TRACKS.some(ot => ot.id === track.trackId));
      const communityDisplayStats = allTracksWithUserData.filter(track => COMMUNITY_TRACKS.some(ct => ct.id === track.trackId));


      // Helper to handle undefined/NaN/Error values, pushing them to the end for sorting
      // Updated type annotation for valA and valB to include TrackWithUserData
      const compareValues = (valA: LeaderboardEntry | { error: string, retryCount: number } | null | TrackWithUserData | undefined, valB: LeaderboardEntry | { error: string, retryCount: number } | null | TrackWithUserData | undefined, ascending: boolean, isNumeric: boolean, sortByMetric?: 'rank' | 'frames' | 'percent') => {
           // Treat errors and nulls as larger than any valid number/string for sorting purposes
           const isAErrorOrNull = valA === undefined || valA === null || (typeof valA === 'object' && 'error' in valA);
           const isBErrorOrNull = valB === undefined || valB === null || (typeof valB === 'object' && 'error' in valB);

           if (isAErrorOrNull && isBErrorOrNull) return 0; // Both are errors/null, maintain relative order
           if (isAErrorOrNull) return 1; // A is error/null, push to end
           if (isBErrorOrNull) return -1; // B is error/null, push to end

            // Now we know both are not errors/null. They could be LeaderboardEntry or TrackWithUserData (for alphabetical sort).
           if (isNumeric && sortByMetric) {
               // Further check if they are actually LeaderboardEntry objects
               if (typeof valA !== 'object' || valA === null || 'error' in valA) return 1; // A is not a valid entry, push to end
               if (typeof valB !== 'object' || valB === null || 'error' in valB) return -1; // B is not a valid entry, push to end

               const aEntry = valA as LeaderboardEntry; // Now this cast is safer
               const bEntry = valB as LeaderboardEntry; // Now this cast is safer

               let numA, numB;
               if (sortByMetric === 'rank') {
                   numA = aEntry.rank;
                   numB = bEntry.rank;
               } else if (sortByMetric === 'frames') {
                   numA = aEntry.frames;
                   numB = bEntry.frames;
               } else if (sortByMetric === 'percent') {
                   numA = aEntry.percent;
                   numB = bEntry.percent;
               } else {
                   return 0; // Should not happen
               }

               // Handle potential undefined/NaN within valid entries
                if (numA === undefined || isNaN(numA as number)) return 1;
                if (numB === undefined || isNaN(numB as number)) return -1;

               return ascending ? (numA as number) - (numB as number) : (numB as number) - (numA as number);
           } else if (!isNumeric) {
               // Alphabetical comparison (for trackName)
               // In this case, valA and valB are the TrackWithUserData objects themselves
               const nameA = (valA as TrackWithUserData).trackName;
               const nameB = (valB as TrackWithUserData).trackName;
               // Handle cases where trackName might be missing (though unlikely with current data structure)
               if (!nameA) return 1;
               if (!nameB) return -1;
               return ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
           }

           return 0; // Should not be reached
      };


      const sortStats = (stats: TrackWithUserData[], sortBy: typeof officialSortBy, reverseSort: boolean) => {
          const sorted = [...stats]; // Create a copy to sort

          sorted.sort((a, b) => {
              const aData = a.userData;
              const bData = b.userData;

              let comparison = 0; // Default to 0 for trackOrder

              switch (sortBy) {
                  case 'lowestPercent':
                      // Sort by percent, ascending (lower percent is better)
                      comparison = compareValues(aData, bData, true, true, 'percent');
                      break;
                  case 'highestRank':
                      // Sort by rank, ascending (lower rank number is higher rank)
                      comparison = compareValues(aData, bData, true, true, 'rank');
                      break;
                  case 'fastestTime':
                      // Sort by frames, ascending (lower frames is faster time)
                      comparison = compareValues(aData, bData, true, true, 'frames');
                      break;
                  case 'alphabetical':
                       // Sort by track name, ascending
                       // Pass the TrackWithUserData objects themselves for alphabetical sort
                      comparison = compareValues(a, b, true, false);
                       break;
                  case 'trackOrder':
                  default:
                      // Maintain original order - no sorting needed within this function
                      comparison = 0;
                      break;
              }

               // Apply reverse if needed
               return reverseSort ? -comparison : comparison;
          });

          return sorted;
      };


      return {
          official: sortStats(officialDisplayStats, officialSortBy, reverseOfficialSort), // Pass reverse state
          community: sortStats(communityDisplayStats, communitySortBy, reverseCommunitySort), // Pass reverse state
      };

  }, [userEntriesByTrack, officialSortBy, communitySortBy, reverseOfficialSort, reverseCommunitySort, ALL_TRACKS, OFFICIAL_TRACKS, COMMUNITY_TRACKS]); // Depend on userEntriesByTrack and sort preferences


  // Function to render a list of track stats (used for Official and Community sections)
  const renderTrackStatsList = (stats: TrackWithUserData[], title: string, sortBy: typeof officialSortBy, setSortBy: typeof setOfficialSortBy, reverseSort: boolean, setReverseSort: (reverse: boolean) => void) => {
    const sortOptions = [
        { value: 'trackOrder', label: 'Track Order' },
        { value: 'lowestPercent', label: 'Percent (Lowest)' }, // Kept lowestPercent
        { value: 'highestRank', label: 'Rank (Highest)' }, // Kept highestRank
        { value: 'fastestTime', label: 'Time (Fastest)' }, // Kept fastestTime
        { value: 'alphabetical', label: 'Alphabetical' },
    ];


    return (
      <Card className="bg-gray-800/50 text-white border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> {/* Adjusted header for layout */}
              <CardTitle className="text-purple-400">{title}</CardTitle>
              {/* Sort Controls */}
              <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-300">Sort by:</span>
                  <Select onValueChange={(value: typeof sortBy) => setSortBy(value)} defaultValue={sortBy}>
                      <SelectTrigger className="w-[180px] bg-black/20 text-white border-purple-500/30 focus:ring-purple-500/50">
                          <SelectValue placeholder="Select Sort Option" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 text-white border-purple-500/30">
                          {sortOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                   {/* Reverse Order Button */}
                   <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setReverseSort(!reverseSort)} // Toggle reverse state
                       className={cn(
                           "bg-black/20 text-white border-purple-500/30 hover:bg-purple-700/30",
                           { "bg-purple-700/50": reverseSort } // Highlight when reversed
                       )}
                       title="Reverse Order"
                   >
                       <ArrowUpDown className="h-4 w-4" />
                   </Button>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
              {stats.length > 0 ? (
                  stats.map((track, index) => {
                      const entryOrError = userEntriesByTrack.get(track.trackId); // Get entry or error from the map

                      // Check if it's an error object
                      const isError = entryOrError && typeof entryOrError === 'object' && 'error' in entryOrError;
                      const errorMessage = isError ? entryOrError.error : null;
                      const retryCount = isError ? entryOrError.retryCount : 0;


                      // Determine display values
                      const timeDisplay = isError ? 'Error' : formatTime((entryOrError as LeaderboardEntry)?.frames);
                      const rankDisplay = isError ? 'Error' : (entryOrError && typeof entryOrError === 'object' && 'rank' in entryOrError && (entryOrError as LeaderboardEntry).rank !== undefined ? (entryOrError as LeaderboardEntry).rank : 'N/A');
                       // Corrected percentDisplay logic for stricter type checking
                      const percentDisplay = isError ? 'Error' : (entryOrError !== null && entryOrError !== undefined && typeof entryOrError === 'object' && 'percent' in entryOrError && typeof (entryOrError as any).percent === 'number' ? (entryOrError as any).percent?.toFixed(4) + '%' : 'N/A');
                      const verifiedStateDisplay = isError ? undefined : (entryOrError as LeaderboardEntry)?.verifiedState;



                      return (
                          <motion.div
                              key={track.trackId} // Use trackId as the stable key
                              id={`track-${track.trackId}`} // Add unique ID for scrolling
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.03 }} // Slightly faster animation delay
                              className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700 pb-3 last:border-b-0 last:pb-0"
                          >
                              <div className="flex-1 mr-4">
                                  <p className="font-semibold text-blue-300">{track.trackName}</p>
                                  {isError ? (
                                      <div className="text-sm text-red-400 flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4" />
                                          <span>{errorMessage || 'Failed to load'} ({retryCount}/{MAX_RETRY_ATTEMPTS} retries)</span> {/* Display retry count */}
                                           {errorMessage !== 'Retrying...' && retryCount < MAX_RETRY_ATTEMPTS && ( // Only show retry button if not retrying and below max attempts
                                              <Button
                                                  variant="outline"
                                                  size="sm" // Changed size back to sm for more padding
                                                  onClick={() => handleRetryTrack(track.trackId, track.trackName, false)} // Pass false for isAutoRetry
                                                  className="bg-red-900/30 text-red-300 border-red-500/30 hover:bg-red-800/50 px-2 py-1" // Added padding classes
                                              >
                                                  <RotateCw className="h-3 w-3 mr-1" /> {/* Added RotateCw icon */}
                                                  Retry
                                              </Button>
                                          )}
                                           {errorMessage === 'Retrying...' && ( // Show loading spinner when retrying
                                               <RotateCw className="h-4 w-4 animate-spin text-red-400" />
                                           )}
                                            {retryCount >= MAX_RETRY_ATTEMPTS && errorMessage !== 'Retrying...' && (
                                                <span className="text-xs text-gray-500 italic">Max retries reached.</span>
                                            )}
                                      </div>
                                  ) : (
                                      <p className="text-sm text-gray-300">Time: {timeDisplay}</p>
                                  )}
                              </div>
                               {!isError && ( // Only show stats if not in an error state
                                   <div className="flex items-center gap-4 mt-2 sm:mt-0">
                                       <p className="text-sm text-gray-300">Rank: {rankDisplay}</p>
                                       <p className="text-sm text-gray-300">Percent: {percentDisplay}</p>
                                       <div className="flex items-center gap-1">
                                           {/* Only show medals if there is an entry */}
                                           {entryOrError && getPosMedal((entryOrError as LeaderboardEntry).position) && (
                                                <>
                                                    <Tooltip id={`pos-medal-${track.trackId}`}><span className="text-xs">{getPosMedal((entryOrError as LeaderboardEntry).position)?.label}</span></Tooltip>
                                                    <span
                                                        data-tooltip-id={`pos-medal-${track.trackId}`}
                                                        className={`text-${getPosMedal((entryOrError as LeaderboardEntry).position)?.color} text-lg`}
                                                        title={getPosMedal((entryOrError as LeaderboardEntry).position)?.label}
                                                    >
                                                        {getPosMedal((entryOrError as LeaderboardEntry).position)?.icon}
                                                    </span>
                                               </>
                                           )}
                                            {entryOrError && getMedal((entryOrError as LeaderboardEntry).percent) && (
                                               <>
                                                    <Tooltip id={`percent-medal-${track.trackId}`}><span className="text-xs">{getMedal((entryOrError as LeaderboardEntry).percent)?.label}</span></Tooltip>
                                                    <span
                                                        data-tooltip-id={`percent-medal-${track.trackId}`}
                                                        className={`text-${getMedal((entryOrError as LeaderboardEntry).percent)?.color} text-lg`}
                                                        title={getMedal((entryOrError as LeaderboardEntry).percent)?.label}
                                                    >
                                                        {getMedal((entryOrError as LeaderboardEntry).percent)?.icon}
                                                    </span>
                                               </>
                                           )}
                                       </div>
                                        {/* Only show verified state if there is an entry */}
                                        {entryOrError && typeof entryOrError === 'object' && !('error' in entryOrError) && <VerifiedStateIcon verifiedState={(entryOrError as LeaderboardEntry).verifiedState} />}
                                   </div>
                               )}
                          </motion.div>
                      );
                  })
              ) : (
                  <p className="text-gray-400">No tracks available.</p>
              )}
          </CardContent>
      </Card>
    );
  };

    // Helper function to render a single best/worst stat entry with medals
    const renderBestWorstEntry = (label: string, entry: LeaderboardEntryWithTrackName | undefined, metric: 'time' | 'rank' | 'percent') => {
        if (!entry) return <p className="text-gray-400">{label}: N/A</p>;

        let value: string | number = 'N/A';
        let trackInfo = '';
        // Removed tooltipId and data-tooltip attributes from here


        if (metric === 'time') {
            value = formatTime(entry.frames);
            trackInfo = ` on ${entry.trackName}`;
        } else if (metric === 'rank') {
            value = entry.rank !== undefined ? entry.rank : 'N/A';
             if (value !== 'N/A') trackInfo = ` on ${entry.trackName}`;
        } else if (metric === 'percent') {
            value = entry.percent !== undefined ? entry.percent.toFixed(4) + '%' : 'N/A';
             if (value !== 'N/A') trackInfo = ` on ${entry.trackName}`;
        }

        // Get both position and mineral medals for this entry
        const posMedal = getPosMedal(entry.position);
        const percentMedal = getMedal(entry.percent);


        return (
            <p className="text-gray-300 flex items-center gap-1"> {/* Use flex and gap for inline items */}
                {label}:
                 <span className="font-semibold text-blue-300"> {/* Removed tooltip attributes */}
                     {value}
                 </span>
                 {/* Removed Tooltip component for the value */}

                {trackInfo && <span className="text-gray-400 text-sm italic">{trackInfo}</span>}

                {/* Display both medals if they exist */}
                {posMedal && (
                    <>
                        {/* Kept medal tooltips */}
                        <Tooltip id={`best-worst-${metric}-${entry.trackId}-pos-medal`}><span className="text-xs">{posMedal.label}</span></Tooltip> {/* Tooltip for the position medal */}
                        <span
                             data-tooltip-id={`best-worst-${metric}-${entry.trackId}-pos-medal`} // Unique ID for position medal tooltip
                            className={`text-${posMedal.color} text-lg`}
                            title={posMedal.label || ''} // Add title for accessibility
                        >
                            {posMedal.icon}
                        </span>
                    </>
                )}
                 {percentMedal && (
                    <>
                        {/* Kept medal tooltips */}
                        <Tooltip id={`best-worst-${metric}-${entry.trackId}-percent-medal`}><span className="text-xs">{percentMedal.label}</span></Tooltip> {/* Tooltip for the percent medal */}
                        <span
                            data-tooltip-id={`best-worst-${metric}-${entry.trackId}-percent-medal`} // Unique ID for percent medal tooltip
                            className={`text-${percentMedal.color} text-lg`}
                            title={percentMedal.label || ''} // Add title for accessibility
                        >
                            {percentMedal.icon}
                        </span>
                    </>
                 )}
            </p>
        );
    };


  return (
    // Main container with background and centering
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4 md:p-8 flex justify-center items-start">
      <AnimatePresence>
        {copiedText && <CopyPopup text={copiedText} />}
      </AnimatePresence>
      {/* Motion div for the main content block */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "max-w-4xl w-full space-y-6", // Adjusted max-w to 4xl to make the box less wide
           // Conditionally center vertically only when in input mode and no error
          { 'flex flex-col justify-center items-center min-h-[calc(100vh-4rem)]': displayMode === 'input' && !error }
        )}
      >
        {/* Increased font size for the title with dropdown animation */}
        <motion.h1
           initial={{ opacity: 0, y: -50 }} // Start above and hidden
           animate={{ opacity: 1, y: 0 }} // End at normal position and visible
           transition={{ duration: 0.8, ease: "easeOut" }} // Add a slight delay after the main box starts
           className="text-4xl sm:text-5xl md:text-6xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400"
        >
          User
        </motion.h1>

        {/* Input and Search Section */}
        <Card className="bg-gray-800/50 text-white border-purple-500/30">
            <CardHeader>
                 <CardTitle className="text-purple-400">Search User Stats</CardTitle>
                 <CardDescription className="text-gray-300">Enter a User ID or User Token to view their stats across all tracks.</CardDescription> {/* Updated description */}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Container for Select and Input */}
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                   {/* User Input Type Select */}
                   <Select onValueChange={(value: 'userid' | 'usertoken') => setUserInputType(value)} defaultValue={userInputType}>
                       <SelectTrigger className="w-[180px] bg-black/20 text-white border-purple-500/30 focus:ring-purple-500/50">
                           <SelectValue placeholder="Select Input Type" />
                       </SelectTrigger>
                       <SelectContent className="bg-gray-800 text-white border-purple-500/30">
                           <SelectItem value="userid">User ID</SelectItem>
                           <SelectItem value="usertoken">User Token</SelectItem>
                       </SelectContent>
                   </Select>

                   {/* User Input Field */}
                   <Input
                     type="text"
                     placeholder={userInputType === 'userid' ? 'Enter User ID' : 'Enter User Token'}
                     value={userInput}
                     onChange={(e) => setUserInput(e.target.value)}
                     className="flex-1 bg-black/20 text-white border-purple-500/30 placeholder:text-gray-500 focus:ring-purple-500/50"
                   />
                </div>

                {/* Search Button - Moved outside the flex container and made full width */}
                <Button
                  onClick={processUserInputAndFetchData}
                  disabled={loading || !userInput} // Disable if loading or no input
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-8 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 w-full" // Added w-full
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"></path>
                    </svg>
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                  <span className="ml-2">Search</span>
                </Button>
            </CardContent>
        </Card>


        {/* Error Display */}
        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="w-full"
                >
                    <Alert variant="destructive" className="bg-red-900/50 text-red-300 border-red-500/30">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <AlertTitle className="text-red-400">Error</AlertTitle>
                        <AlertDescription>
                            {error}
                             {error.includes("Failed to process user token") && (
                                <p className="mt-2 text-sm text-red-200">
                                    Suggestion: Double-check the User Token entered.
                                </p>
                            )}
                             {error.includes("Could not resolve user ID") && (
                                <p className="mt-2 text-sm text-red-200">
                                    Suggestion: Ensure the entered User ID or User Token is correct.
                                </p>
                            )}
                             {error.includes("User ID not found on any official or community tracks") && (
                                 <p className="mt-2 text-sm text-red-200">
                                     Suggestion: The user might not have any entries on the listed tracks, or the User ID is incorrect.
                                 </p>
                             )}
                              {error.includes("User ID found, but no entries were found on any tracks") && (
                                 <p className="mt-2 text-sm text-red-200">
                                     Suggestion: The User ID is valid, but no entries were found on the listed tracks.
                                 </p>
                             )}
                        </AlertDescription>
                    </Alert>
                </motion.div>
            )}
        </AnimatePresence>

        {/* User Basic Data Display */}
        <AnimatePresence mode="wait">
            {basicUserData && resolvedUserId && (
                 <motion.div
                    key="basic-user-data"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                    className="w-full"
                 >
                     <Card className="bg-gray-800/50 text-white border-purple-500/30">
                         <CardHeader>
                             <CardTitle className="text-purple-400">User Information</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-2">
                             <p className="text-gray-300">Name: <span className="font-semibold text-blue-300">{basicUserData.name}</span></p>
                             <p className="text-gray-300 flex items-center">
                                 User ID:
                                 <span className="font-mono text-sm text-gray-400 ml-2 truncate">{resolvedUserId}</span>
                                 <Button
                                     variant="link"
                                     size="sm"
                                     onClick={() => copyToClipboard(resolvedUserId)}
                                     className="text-blue-400 p-0 ml-1"
                                     title="Copy User ID"
                                 >
                                     <Copy className="w-3 h-3" />
                                 </Button>
                             </p>
                             <div className="flex items-center text-gray-300">
                                 Car Colors: <span className="ml-2">{displayCarColors(basicUserData.carColors)}</span>
                             </div>
                              <p className="text-gray-300 flex items-center">
                                 Is Verifier: <span className="ml-2">
                                     {basicUserData.isVerifier === 'N/A' ? 'N/A' : (basicUserData.isVerifier ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-400" />)}
                                 </span>
                             </p>
                             {userInputType === 'userid' && (
                                 <p className="text-sm text-gray-400 italic">
                                     Is Verifier status cannot be determined from a User ID. A User Token is required for this information.
                                 </p>
                             )}
                         </CardContent>
                     </Card>
                 </motion.div>
            )}
             {/* Display "User Information Unavailable" message if loading is done, resolvedUserId is set, and basicUserData is null or indicates not found */}
             {!loading && resolvedUserId && basicUserData != null && (
                // Explicitly check basicUserData is an object before accessing name
                typeof basicUserData === 'object' && (
                    basicUserData.name === 'Searching for user...' ||
                    basicUserData.name === 'Fetching Name...' ||
                    basicUserData.name === 'Error fetching track data' ||
                    basicUserData.name.startsWith('User Info Unavailable')
                )
             ) && ( // Added the closing parenthesis and && for the conditional rendering
                 <motion.div
                     key="user-info-unavailable"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 20 }}
                     transition={{ duration: 0.5 }}
                     className="w-full"
                 >
                     <Alert variant="default" className="bg-blue-900/50 text-blue-300 border-blue-500/30">
                         <TriangleAlert className="h-4 w-4 text-blue-400" />
                         <AlertTitle className="text-blue-400">User Information Unavailable</AlertTitle>
                         <AlertDescription className="text-purple-300">
                             We could not retrieve user information for the provided input. This might mean the User ID or Token is incorrect, or the user has no entries on any tracks.
                         </AlertDescription>
                     </Alert>
                 </motion.div>
            )}
        </AnimatePresence>


        {/* Conditional Display Area */}
        <AnimatePresence mode="wait"> {/* Use mode="wait" to ensure one section exits before the next enters */}
            {displayMode === 'allTrackStats' && (officialTracksWithEntries.length > 0 || communityTracksWithEntries.length > 0 || officialAverageStats || communityAverageStats || overallAverageStats || Object.keys(medalTracks).length > 0 || Object.keys(officialBestWorst).length > 0 || Object.keys(communityBestWorst).length > 0 || Object.keys(overallBestWorst).length > 0 || Array.from(userEntriesByTrack.values()).some(entry => entry && typeof entry === 'object' && 'error' in entry)) && ( // Also show if there are errors
                 <motion.div
                    key="all-track-stats" // Unique key for AnimatePresence
                    initial={{ opacity: 0, y: 20, scaleX: 0.95 }} // Added scaleX for widening effect
                    animate={{ opacity: 1, y: 0, scaleX: 1 }} // Animate to full scale
                    exit={{ opacity: 0, y: 20, scaleX: 0.95 }} // Animate back on exit
                    transition={{ duration: 0.5 }}
                    className="w-full space-y-6 origin-center" // Added origin-center for scaling from the middle
                 >
                     {/* Combined Average Stats Display */}
                     {(overallAverageStats || officialAverageStats || communityAverageStats) && (
                          <Card className="bg-gray-800/50 text-white border-purple-500/30">
                              <CardHeader>
                                  <CardTitle className="text-purple-400">Average Stats</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4"> {/* Use space-y-4 for vertical spacing between sections */}
                                  {/* Overall Averages */}
                                  {overallAverageStats && (
                                      <div>
                                          <h4 className="text-lg font-semibold text-blue-300 mb-2">Overall (All Tracks with Entries)</h4>
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                              <div className="text-center">
                                                  <p className="text-gray-300">Avg Time:</p>
                                                  <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                      {/* Average time now includes milliseconds */}
                                                      {overallAverageStats.avgTime}
                                                  </p>
                                              </div>
                                              <div className="text-center">
                                                  <p className="text-gray-300">Avg Rank:</p>
                                                  <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                      {overallAverageStats.avgRank}
                                                       {/* Medals for Overall Average Rank (using raw average) */}
                                                      {overallAverageStats?.rawAvgRank !== undefined && getPosMedal(overallAverageStats.rawAvgRank) && (
                                                           <>
                                                           <Tooltip id="avg-overall-rank-tip"><span className="text-xs">{getPosMedal(overallAverageStats.rawAvgRank)?.label}</span></Tooltip>
                                                           <span
                                                               data-tooltip-id="avg-overall-rank-tip"
                                                               className={`text-${getPosMedal(overallAverageStats.rawAvgRank)?.color} text-xl`}
                                                           >
                                                               {getPosMedal(overallAverageStats.rawAvgRank)?.icon}
                                                           </span>
                                                        </>
                                                       )}
                                                  </p>
                                             </div>
                                              <div className="text-center">
                                                  <p className="text-gray-300">Avg Percent:</p>
                                                  <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                      {overallAverageStats.avgPercent}
                                                      {/* Medals for Overall Average Percent (using raw average) */}
                                                      {overallAverageStats?.rawAvgPercent !== undefined && getMedal(overallAverageStats.rawAvgPercent) && (
                                                           <>
                                                                <Tooltip id="avg-overall-percent-tip"><span className="text-xs">{getMedal(overallAverageStats.rawAvgPercent)?.label}</span></Tooltip>
                                                                <span
                                                                    data-tooltip-id="avg-overall-percent-tip"
                                                                    className={`text-${getMedal(overallAverageStats.rawAvgPercent)?.color} text-xl`}
                                                                >
                                                                    {getMedal(overallAverageStats.rawAvgPercent)?.icon}
                                                                </span >
                                                           </>
                                                       )}
                                                  </p>
                                              </div>
                                          </div>
                                      </div>
                                  )}

                                   {/* Separator if both overall and category averages exist */}
                                   {(overallAverageStats && (officialAverageStats || communityAverageStats)) && <hr className="border-gray-700" />}


                                  {/* Official Track Averages */}
                                   {officialAverageStats && (
                                       <div>
                                           <h4 className="text-lg font-semibold text-blue-300 mb-2">Official Tracks (with Entries)</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="text-center">
                                                    <p className="text-gray-300">Avg Time:</p>
                                                    <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                        {/* Average time now includes milliseconds */}
                                                        {officialAverageStats.avgTime}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-gray-300">Avg Rank:</p>
                                                    <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                        {officialAverageStats.avgRank}
                                                         {/* Medals for Official Average Rank (using raw average) */}
                                                        {officialAverageStats?.rawAvgRank !== undefined && getPosMedal(officialAverageStats.rawAvgRank) && (
                                                             <>
                                                                  <Tooltip id="avg-official-rank-tip"><span className="text-xs">{getPosMedal(officialAverageStats.rawAvgRank)?.label}</span></Tooltip>
                                                                  <span
                                                                      data-tooltip-id="avg-official-rank-tip"
                                                                      className={`text-${getPosMedal(officialAverageStats.rawAvgRank)?.color} text-xl`}
                                                                  >
                                                                      {getPosMedal(officialAverageStats.rawAvgRank)?.icon}
                                                                  </span>
                                                             </>
                                                         )}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-gray-300">Avg Percent:</p>
                                                    <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                        {officialAverageStats.avgPercent} {/* Corrected: Added curly braces */}
                                                         {/* Medals for Official Average Percent (using raw average) */}
                                                        {officialAverageStats?.rawAvgPercent !== undefined && getMedal(officialAverageStats.rawAvgPercent) && (
                                                             <>
                                                                  <Tooltip id="avg-official-percent-tip"><span className="text-xs">{getMedal(officialAverageStats.rawAvgPercent)?.label}</span></Tooltip>
                                                                  <span
                                                                      data-tooltip-id="avg-official-percent-tip"
                                                                      className={`text-${getMedal(officialAverageStats.rawAvgPercent)?.color} text-xl`}
                                                                  >
                                                                      {getMedal(officialAverageStats.rawAvgPercent)?.icon} {/* Corrected: Fixed typo .ico to .icon */}
                                                                  </span>
                                                             </>
                                                         )}
                                                    </p>
                                                </div>
                                            </div>
                                       </div>
                                   )}

                                    {/* Separator if both official and community averages exist */}
                                   {(officialAverageStats && communityAverageStats) && <hr className="border-gray-700" />}


                                  {/* Community Track Averages */}
                                   {communityAverageStats && (
                                       <div>
                                           <h4 className="text-lg font-semibold text-blue-300 mb-2">Community Tracks (with Entries)</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="text-center">
                                                   <p className="text-gray-300">Avg Time:</p>
                                                    <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                        {/* Average time now includes milliseconds */}
                                                        {communityAverageStats.avgTime}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-gray-300">Avg Rank:</p>
                                                    <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                        {communityAverageStats.avgRank}
                                                         {/* Medals for Community Average Rank (using raw average) */}
                                                        {communityAverageStats?.rawAvgRank !== undefined && getPosMedal(communityAverageStats.rawAvgRank) && (
                                                             <>
                                                                  <Tooltip id="avg-community-rank-tip"><span className="text-xs">{getPosMedal(communityAverageStats.rawAvgRank)?.label}</span></Tooltip>
                                                                  <span
                                                                      data-tooltip-id="avg-community-rank-tip"
                                                                      className={`text-${getPosMedal(communityAverageStats.rawAvgRank)?.color} text-xl`}
                                                                  >
                                                                      {getPosMedal(communityAverageStats.rawAvgRank)?.icon}
                                                                  </span>
                                                             </>
                                                         )}
                                                    </p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-gray-300">Avg Percent:</p>
                                                    <p className="font-semibold text-lg flex items-center justify-center gap-1">
                                                        {communityAverageStats.avgPercent}
                                                         {/* Medals for Community Average Percent (using raw average) */}
                                                        {communityAverageStats?.rawAvgPercent !== undefined && getMedal(communityAverageStats.rawAvgPercent) && (
                                                             <>
                                                                  <Tooltip id="avg-community-percent-tip"><span className="text-xs">{getMedal(communityAverageStats.rawAvgPercent)?.label}</span></Tooltip>
                                                                  <span
                                                                      data-tooltip-id="avg-community-percent-tip"
                                                                      className={`text-${getMedal(communityAverageStats.rawAvgPercent)?.color} text-xl`}
                                                                  >
                                                                      {getMedal(communityAverageStats.rawAvgPercent)?.icon}
                                                                  </span>
                                                             </>
                                                         )}
                                                    </p>
                                                </div>
                                            </div>
                                       </div>
                                   )}

                                   {/* Message if no average stats are available */}
                                   {!(overallAverageStats || officialAverageStats || communityAverageStats) && (
                                        <p className="text-gray-400 text-center">No average stats available (user has no entries on any tracks).</p>
                                   )}

                             </CardContent>
                         </Card>
                     )}

                     {/* Best and Worst Performances Display */}
                     {(Object.keys(overallBestWorst).length > 0 || Object.keys(officialBestWorst).length > 0 || Object.keys(communityBestWorst).length > 0) && (
                         <Card className="bg-gray-800/50 text-white border-purple-500/30">
                             <CardHeader>
                                 <CardTitle className="text-purple-400">Best & Worst Performances</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-4"> {/* Use space-y-4 for vertical spacing between sections */}
                                 {/* Overall Best/Worst */}
                                 {Object.keys(overallBestWorst).length > 0 && (
                                     <div>
                                         <h4 className="text-lg font-semibold text-blue-300 mb-2">Overall (All Tracks with Entries)</h4>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                             <div>
                                                 <p className="font-semibold text-gray-300 mb-1">Best:</p>
                                                 {renderBestWorstEntry('Time', overallBestWorst.bestTime, 'time')}
                                                 {renderBestWorstEntry('Rank', overallBestWorst.bestRank, 'rank')}
                                                 {renderBestWorstEntry('Percent', overallBestWorst.bestPercent, 'percent')}
                                             </div>
                                             <div>
                                                 <p className="font-semibold text-gray-300 mb-1">Worst:</p>
                                                 {renderBestWorstEntry('Time', overallBestWorst.worstTime, 'time')}
                                                 {renderBestWorstEntry('Rank', overallBestWorst.worstRank, 'rank')}
                                                 {renderBestWorstEntry('Percent', overallBestWorst.worstPercent, 'percent')}
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 {/* Separator */}
                                 {(Object.keys(overallBestWorst).length > 0 && (Object.keys(officialBestWorst).length > 0 || Object.keys(communityBestWorst).length > 0)) && <hr className="border-gray-700" />}

                                 {/* Official Tracks Best/Worst */}
                                  {Object.keys(officialBestWorst).length > 0 && (
                                     <div>
                                         <h4 className="text-lg font-semibold text-blue-300 mb-2">Official Tracks (with Entries)</h4>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                             <div>
                                                 <p className="font-semibold text-gray-300 mb-1">Best:</p>
                                                 {renderBestWorstEntry('Time', officialBestWorst.bestTime, 'time')}
                                                 {renderBestWorstEntry('Rank', officialBestWorst.bestRank, 'rank')}
                                                 {renderBestWorstEntry('Percent', officialBestWorst.bestPercent, 'percent')}
                                             </div>
                                             <div>
                                                 <p className="font-semibold text-gray-300 mb-1">Worst:</p>
                                                 {renderBestWorstEntry('Time', officialBestWorst.worstTime, 'time')}
                                                 {renderBestWorstEntry('Rank', officialBestWorst.worstRank, 'rank')}
                                                 {renderBestWorstEntry('Percent', officialBestWorst.worstPercent, 'percent')}
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                 {/* Separator */}
                                 {(Object.keys(officialBestWorst).length > 0 && Object.keys(communityBestWorst).length > 0) && <hr className="border-gray-700" />}

                                 {/* Community Tracks Best/Worst */}
                                  {Object.keys(communityBestWorst).length > 0 && (
                                     <div>
                                         <h4 className="text-lg font-semibold text-blue-300 mb-2">Community Tracks (with Entries)</h4>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                             <div>
                                                 <p className="font-semibold text-gray-300 mb-1">Best:</p>
                                                 {renderBestWorstEntry('Time', communityBestWorst.bestTime, 'time')}
                                                 {renderBestWorstEntry('Rank', communityBestWorst.bestRank, 'rank')}
                                                 {renderBestWorstEntry('Percent', communityBestWorst.bestPercent, 'percent')}
                                             </div>
                                             <div>
                                                 <p className="font-semibold text-gray-300 mb-1">Worst:</p>
                                                 {renderBestWorstEntry('Time', communityBestWorst.worstTime, 'time')}
                                                 {renderBestWorstEntry('Rank', communityBestWorst.worstRank, 'rank')}
                                                 {renderBestWorstEntry('Percent', communityBestWorst.worstPercent, 'percent')}
                                             </div>
                                         </div>
                                     </div>
                                 )}

                                  {/* Message if no best/worst stats are available */}
                                   {!(Object.keys(overallBestWorst).length > 0 || Object.keys(officialBestWorst).length > 0 || Object.keys(communityBestWorst).length > 0) && (
                                        <p className="text-gray-400 text-center">No best/worst stats available (user has no entries on any tracks).</p>
                                   )}

                             </CardContent>
                         </Card>
                     )}


                     {/* Medal Counts Display */}
                     {Object.keys(medalTracks).length > 0 && ( // Use medalTracks here
                         <Card className="bg-gray-800/50 text-white border-purple-500/30">
                             <CardHeader>
                                 <CardTitle className="text-purple-400">Medal Counts</CardTitle>
                                 <CardDescription className="text-gray-300">Hover over a medal to see the tracks you earned it on. Click a track name to jump to its entry below.</CardDescription> {/* Updated description */}
                             </CardHeader>
                             <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                 {/* Define the order of medals for display */}
                                 {['WR', 'Podium', 'Diamond', 'Emerald', 'Gold', 'Silver', 'Bronze'].map(medalLabel => {
                                     const tracks = medalTracks[medalLabel]; // Get the array of tracks
                                     if (!tracks || tracks.length === 0) return null; // Only display if there are tracks for this medal

                                     // Find the corresponding medal object to get icon and color
                                     const medal = getMedalByLabel(medalLabel);
                                     const isHovered = hoveredMedal === medalLabel;


                                     return (
                                         <motion.div
                                             key={medalLabel}
                                             initial={{ opacity: 0, scale: 0.8, maxHeight: 80 }} // Increased initial maxHeight
                                             animate={{
                                                 opacity: 1,
                                                 scale: 1,
                                                 maxHeight: isHovered ? 300 : 80 // Increased maxHeight on hover end
                                             }}
                                             transition={{ duration: 0.3 }}
                                             className="flex flex-col items-center justify-start p-3 pb-4 bg-gray-700/50 rounded-md overflow-hidden cursor-pointer" // Added pb-4 for bottom padding
                                             onHoverStart={() => setHoveredMedal(medalLabel)} // Set hovered state
                                             onHoverEnd={() => setHoveredMedal(null)} // Clear hovered state
                                         >
                                             <div className="flex items-center gap-1 mb-1">
                                                  {medal && (
                                                       <>
                                                            {/* Removed the duplicate Tooltip here */}
                                                            <span
                                                                data-tooltip-id={`medal-count-tip-${medalLabel}`} // Ensure this ID matches the Tooltip at the bottom
                                                                className={`text-${medal.color} text-2xl`}
                                                            >
                                                                {medal.icon}
                                                            </span>
                                                       </>
                                                  )}
                                             </div>
                                             <span className="text-xl font-bold text-purple-400">{medalLabel}: {tracks.length}</span> {/* Display count */}

                                             {/* Track List - Conditionally rendered and animated */}
                                             <AnimatePresence>
                                                 {isHovered && (
                                                     <motion.ul
                                                         initial={{ opacity: 0, y: 10 }}
                                                         animate={{ opacity: 1, y: 0 }}
                                                         exit={{ opacity: 0, y: 10 }}
                                                         transition={{ duration: 0.2 }}
                                                         className="mt-2 text-sm text-gray-300 w-full text-center space-y-1 list-none p-0" // Added list-none and p-0 for styling
                                                     >
                                                         {tracks.map(track => {
                                                             // Determine which metric to display based on medal type
                                                             const displayMetric = medal?.type === 'rank' ?
                                                                 (track.rank !== undefined ? `Rank: ${track.rank}` : 'Rank: N/A') :
                                                                 (track.percent !== undefined ? `Percent: ${track.percent.toFixed(4)}%` : 'Percent: N/A');

                                                             return (
                                                                 <li key={track.trackId} className="truncate"> {/* Use trackId as key for consistency */}
                                                                     {/* Added data-tooltip-id and data-tooltip-content for react-tooltip */}
                                                                     <span
                                                                         className="cursor-pointer hover:underline" // Indicate clickable and add hover effect
                                                                         data-tooltip-id={`track-tooltip-${track.trackId}`} // Unique ID for each track tooltip
                                                                         data-tooltip-content={`${displayMetric}`} // Set the tooltip text to ONLY the metric
                                                                         onClick={() => scrollToTrack(track.trackId)} // Add onClick handler
                                                                     >
                                                                         {track.trackName}
                                                                     </span>
                                                                      {/* Add a Tooltip component for each track name */}
                                                                     <Tooltip id={`track-tooltip-${track.trackId}`} place="top" className="!text-xs !bg-gray-700 !text-white" />
                                                                 </li>
                                                             );
                                                         })}
                                                     </motion.ul>
                                                 )}
                                             </AnimatePresence>
                                         </motion.div>
                                     );
                                 })}
                             </CardContent>
                         </Card>
                     )}


                     {/* Official Track Stats List */}
                     {/* Pass the full list of official tracks and the map of user entries */}
                     {renderTrackStatsList(sortedTrackDisplayStats.official, "Official Track Entries", officialSortBy, setOfficialSortBy, reverseOfficialSort, setReverseOfficialSort)} {/* Pass reverse state and setter */}

                     {/* Community Track Stats List */}
                      {/* Pass the full list of community tracks and the map of user entries */}
                     {renderTrackStatsList(sortedTrackDisplayStats.community, "Community Track Entries", communitySortBy, setCommunitySortBy, reverseCommunitySort, setReverseCommunitySort)} {/* Pass reverse state and setter */}

                 </motion.div>
            )}
        </AnimatePresence>

         {/* Tooltip component */}
         <Tooltip id="unverified-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         <Tooltip id="verified-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         <Tooltip id="unknown-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         {/* Tooltips for Average Medals */}
         <Tooltip id="avg-overall-rank-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         <Tooltip id="avg-overall-percent-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         <Tooltip id="avg-official-rank-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         <Tooltip id="avg-official-percent-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         <Tooltip id="avg-community-rank-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
         <Tooltip id="avg-community-percent-tip" place="top" className="!text-xs !bg-gray-700 !text-white" />
          {/* Tooltips for Medal Counts */}
         {/* Tooltips for Medal Counts - These are now less critical as hover shows tracks directly, but kept for completeness */}
         {['WR', 'Podium', 'Diamond', 'Emerald', 'Gold', 'Silver', 'Bronze'].map(label => {
             const medal = getMedalByLabel(label);
             if (!medal) return null;
             return (
                 <Tooltip key={`medal-count-tip-${label}`} id={`medal-count-tip-${label}`} place="top" className="!text-xs !bg-gray-700 !text-white">
                     <span>{medal.label}</span>
                 </Tooltip>
             );
         })}


      </motion.div>
       {/* Version and Play Game Link - Conditionally rendered */}
       {displayMode === 'input' && (
           <div className="text-center text-gray-500 text-sm mt-4 absolute bottom-4 left-1/2 transform -translate-x-1/2">
               <p>Version: {VERSION}</p>
               <p>
                 Play the game: <a href="https://www.kodub.com/apps/polytrack" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Polytrack</a>
               </p>
           </div>
       )}
    </div>
  );
};

export default UserViewer;
