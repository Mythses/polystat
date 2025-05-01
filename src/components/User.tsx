import { useState, useCallback, useEffect, useRef, useMemo } from 'react'; // Added useMemo
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Trophy, User, Circle, CheckCircle, Copy, AlertCircle, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
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

type LeaderboardEntryWithTrackName = LeaderboardEntry & { trackName: string };

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

// Define the predefined tracks
const OFFICIAL_TRACKS = [
  { name: 'Summer 1', id: 'ef949bfd7492a8b329c30fac19713d9ea96256fb8bf1cdb65cb3727c0205b862' },
  { name: 'Summer 2', id: 'cf1ceacd0e3239a44afe8e4c291bd655a80ffffe559964e9a5bc5c3e21c4cafc' },
  { name: 'Summer 3', id: '456a0ac6f849ecf5d4020ade78f4f2e2e44f3eee3cd21b9452ff8a993e0624dbd2f' }, // Corrected ID based on user's first prompt
  { name: 'Summer 4', id: '668c209f6055c04b9f28e37127884039cb1f8710360bfe5b5578955295151979f' },
  { name: 'Summer 5', id: 'b31551b1fc3cfdf3f76043b82d0c88d92451ae5246ce3db65bc3979e4912d01f' },
  { name: 'Summer 6', id: 'b6657496f1f25ab8b1599c4cc7d93b2cecebef9bd018032993f9c2f92a9f2851' },
  { name: 'Summer 7', id: 'f3d90e905743a30d4a01ff302be3ae0be38ee055cc1a3b99257752e505765c04' },
  { name: 'Winter 1', id: '94de41605004b67581f7a2a4f68c84d352b5b723a604ccb38e511f5eac9d22a9' },
  { name: 'Winter 2', id: 'f84e5f767fc5d53ae0d3ddf95dfb4a9197f361283cdb049673077b0208d12fe8' },
  { name: 'Winter 3', id: '7a0e04bfe09e1bead36ddd2f7e61d32fd6c1e55e907d60edc6ccd3e17532e1f7' },
  { name: 'Winter 4', id: '39b2d610aeed5d193f3346291fc4000ef23030e5817f471522f167b9e74ed1f5' },
  { name: 'Desert 1', id: '56a5e13736d871f92863cb60ad690e78547f459520e61285fde05bd02bd2d349' },
  { name: 'Desert 2', id: '7425633d9f77c41bbf7486fdd2b3a2ce04aa26bacc870a0a32929b4c7e33a8cf3' },
  { name: 'Desert 3', id: 'b84107a25d159c6544092903da12b61573971da5a6b3c917e55be30486ccaddd' },
  { name: 'Desert 4', id: '29b6343e995552c610e24a5bfefc8a240800ed151600c0dc8f5c0f3dce334d322' },
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
  { name: 'Arabica', id: '1aadcef252749318227d5cd4ce61a4a71526087857857104fd57697b6fc63102e8a' },
  { name: 'Clay temples', id: '773eb0b02b97a72f3e482738cda7a5292294800497e16d9366e4f4c88a6f4e2d' },
  { name: 'DESERT STALLION', id: '932da81567f2b223fa1a52d88d6db52016600c5b9df02218f06c9eb832ecddeb' },
  { name: 'Las Calles', id: '97da746d9b3ddd5a861fa8da7fcb6f6402ffa21f8f5cf61029d7a947bad76290' },
  { name: 'Last Remnant', id: '19335bb082dfde2af4f7e73e812cd54cee0039a9eadf3793efee3ae3884ce423' },
  { name: 'Malformations', id: 'bc7d29657a0eb2d0abb3b3639edcf4ade61705132c7ca1b56719a7a110096afd' },
  { name: 'Sandline Ultimatum', id: 'faed71cf26ba4d183795ecc93e3d1b39e191e51d664272b512692b0f4f323ff5' },
];

// ALL_TRACKS is no longer used directly for fetching, but kept for reference if needed
// const ALL_TRACKS = [...OFFICIAL_TRACKS, ...COMMUNITY_TRACKS];

const API_BASE_URL = 'https://vps.kodub.com:43273/leaderboard';
const USER_API_BASE_URL = 'https://vps.kodub.com:43273/user'; // User specific API
const PROXY_URL = 'https://hi-rewis.maxicode.workers.dev/?url='; // Using the provided proxy
const VERSION = '0.5.0';


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
  if (position <= 5) return { icon: '✦', label: 'Podium', color: 'white', type: 'rank' }; // White is standard
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
  const [officialTrackStats, setOfficialTrackStats] = useState<LeaderboardEntry[]>([]); // User's entries on official tracks
  const [communityTrackStats, setCommunityTrackStats] = useState<LeaderboardEntry[]>([]); // User's entries on community tracks

  const [officialSortBy, setOfficialSortBy] = useState<'trackOrder' | 'reverseOrder' | 'highestPercent' | 'lowestPercent' | 'highestRank' | 'lowestRank' | 'fastestTime' | 'slowestTime' | 'alphabetical' | 'reverseAlphabetical'>('trackOrder');
  const [communitySortBy, setCommunitySortBy] = useState<'trackOrder' | 'reverseOrder' | 'highestPercent' | 'lowestPercent' | 'highestRank' | 'lowestRank' | 'fastestTime' | 'slowestTime' | 'alphabetical' | 'reverseAlphabetical'>('trackOrder');


  const [officialAverageStats, setOfficialAverageStats] = useState<AverageStats | null>(null);
  const [communityAverageStats, setCommunityAverageStats] = useState<AverageStats | null>(null);
  const [overallAverageStats, setOverallAverageStats] = useState<AverageStats | null>(null);

  // State to store tracks per medal type, not just counts
  const [medalTracks, setMedalTracks] = useState<{ [key: string]: LeaderboardEntryWithTrackName[] }>({});
  // State to track which medal box is hovered to show tracks
  const [hoveredMedal, setHoveredMedal] = useState<string | null>(null);


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copiedText, setCopiedText] = useState<string | null>(null);
  // Corrected initialization: Initialize useRef with null
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [displayMode, setDisplayMode] = useState<'input' | 'allTrackStats'>('input');

  // Helper to format frames into time string (frames are in milliseconds)
  const formatTime = (frames: number) => {
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


  // Function to fetch user's entry for a specific track
  // onlyVerified parameter is kept but will always be called with false in the new logic
  const fetchUserTrackEntry = useCallback(async (userId: string, trackId: string, onlyVerified: boolean): Promise<LeaderboardEntry | null> => {
      try {
          // Fetch just the userEntry to get the position and total count
          // We fetch only 1 entry (the user's) to get their specific data and rank/percent context
          const userFetchUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=0&amount=1&onlyVerified=${onlyVerified}&userTokenHash=${userId}`)}`;
          const userResponse = await fetch(userFetchUrl);

          if (!userResponse.ok) {
              // It's expected that a user might not have an entry on a track, don't treat as hard error
              return null; // Return null if user not found on this track
          }

          const userData: { total: number; userEntry: LeaderboardEntry | null } = await userResponse.json();

          if (userData.userEntry) {
              // Calculate rank and percent based on userEntry position and total
              const rank = userData.userEntry.position;
              const totalEntries = typeof userData.total === 'number' ? userData.total : 0;
              const percent = totalEntries > 0 && typeof rank === 'number' ? (rank / totalEntries) * 100 : undefined;

              return {
                  ...userData.userEntry,
                  rank: rank,
                  percent: percent
              };
          } else {
              // userEntry is null if user is not on the leaderboard
              return null;
          }

      } catch (err: any) {
          console.error(`Error fetching user entry for track ${trackId}:`, err);
          // Return null on error, don't stop the whole process
          return null;
      }
  }, [PROXY_URL, API_BASE_URL, VERSION]);

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

  // Helper function to group entries by medal type
  const groupEntriesByMedal = (entries: LeaderboardEntryWithTrackName[]): { [key: string]: LeaderboardEntryWithTrackName[] } => {
      const medalMap: { [key: string]: LeaderboardEntryWithTrackName[] } = {};
      entries.forEach(entry => {
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


  // Function to fetch user stats for all tracks
  const fetchAllUserTrackStats = useCallback(async (userId: string) => {
      setLoading(true);
      setError(null);
      setOfficialTrackStats([]);
      setCommunityTrackStats([]);
      setOfficialAverageStats(null);
      setCommunityAverageStats(null);
      setOverallAverageStats(null);
      setMedalTracks({}); // Clear previous medal data
      setHoveredMedal(null); // Clear hovered medal state
      // Basic user data is now fetched separately for User ID input, so no need to clear it here

      // Fetch entries for all official tracks
      const officialStatsPromises = OFFICIAL_TRACKS.map(track =>
          fetchUserTrackEntry(userId, track.id, false).then(entry => entry ? { trackName: track.name, ...entry } : null) // Pass false for onlyVerified
      );
      // Fetch entries for all community tracks
      const communityStatsPromises = COMMUNITY_TRACKS.map(track =>
          fetchUserTrackEntry(userId, track.id, false).then(entry => entry ? { trackName: track.name, ...entry } : null) // Pass false for onlyVerified
      );

      try {
          const officialResults = await Promise.all(officialStatsPromises);
          const communityResults = await Promise.all(communityStatsPromises);

          // Filter out null entries (user has no time on the track)
          const validOfficialStats = officialResults.filter(entry => entry !== null) as (LeaderboardEntry & { trackName: string })[];
          const validCommunityStats = communityResults.filter(entry => entry !== null) as (LeaderboardEntry & { trackName: string })[];

          setOfficialTrackStats(validOfficialStats);
          setCommunityTrackStats(validCommunityStats);

          // Calculate and set individual and overall averages
          setOfficialAverageStats(calculateAverages(validOfficialStats));
          setCommunityAverageStats(calculateAverages(validCommunityStats));
          setOverallAverageStats(calculateAverages([...validOfficialStats, ...validCommunityStats]));

          // Group entries by medal and set the state
          setMedalTracks(groupEntriesByMedal([...validOfficialStats, ...validCommunityStats]));


          setDisplayMode('allTrackStats'); // Switch display mode

      } catch (err: any) {
          console.error("Error fetching all user track stats:", err);
          setError(err.message || 'An error occurred while fetching all user track stats.');
          setOfficialTrackStats([]);
          setCommunityTrackStats([]);
          setOfficialAverageStats(null);
          setCommunityAverageStats(null);
          setOverallAverageStats(null);
          setMedalTracks({}); // Clear medal data on error
          setHoveredMedal(null); // Clear hovered medal state on error
           // Ensure basic user data is set to 'not found' if an error occurs during the main fetch
           if (!basicUserData || basicUserData.name === 'Fetching Name...') { // Check if basic data is still in initial or fetching state
                setBasicUserData({
                    name: 'Error fetching track data', // Indicate error during track data fetch
                    carColors: '',
                    isVerifier: 'N/A',
               });
           }
      } finally {
          setLoading(false);
      }
  }, [fetchUserTrackEntry, OFFICIAL_TRACKS, COMMUNITY_TRACKS, calculateAverages, groupEntriesByMedal, basicUserData]); // Added basicUserData to dependency array


  // Combined function to process input and trigger appropriate data fetching
  const processUserInputAndFetchData = useCallback(async () => {
      setError(null); // Clear error at the start
      setResolvedUserId(null); // Clear previous resolved user ID
      setBasicUserData(null); // Clear previous basic user data
      setOfficialTrackStats([]); // Clear all track data
      setCommunityTrackStats([]);
      setOfficialAverageStats(null);
      setCommunityAverageStats(null);
      setOverallAverageStats(null);
      setMedalTracks({}); // Clear previous medal data
      setHoveredMedal(null); // Clear hovered medal state
      setDisplayMode('input'); // Reset display mode initially

      if (!userInput) {
        setError('Please enter a User ID or User Token.');
        return;
      }

      setLoading(true);
      let targetUserId: string | null = null;
      let processingError: string | null = null;

      // Step 1: Resolve User ID and fetch basic data (name, carColors, isVerifier)
      if (userInputType === 'userid') {
        targetUserId = userInput;
        setBasicUserData({
             name: 'Fetching Name...', // Set a temporary state while fetching
             carColors: '',
             isVerifier: 'N/A', // isVerifier cannot be determined from User ID
        });

        const summer1Track = OFFICIAL_TRACKS.find(track => track.name === 'Summer 1');

        if (summer1Track) {
            try {
                // First call: Get user's position on using userTokenHash
                const firstCallUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${summer1Track.id}&skip=0&amount=1&onlyVerified=false&userTokenHash=${targetUserId}`)}`;
                const firstResponse = await fetch(firstCallUrl);

                if (!firstResponse.ok) {
                     console.warn(`First call failed or user not found (getting position): ${firstResponse.status}`);
                     setBasicUserData({
                          name: 'Name Unavailable (No entry found on)',
                          carColors: '',
                          isVerifier: 'N/A'
                     });
                } else {
                    const firstData: { total: number; userEntry: LeaderboardEntry | null } = await firstResponse.json();

                    if (firstData.userEntry && firstData.userEntry.position !== undefined && firstData.userEntry.position > 0) {
                        const userPosition = firstData.userEntry.position;
                        const skipAmount = userPosition > 1 ? userPosition - 1 : 0; // Calculate skip amount

                        // Second call: Get the user's entry at their position to get name/colors
                        const secondCallUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${summer1Track.id}&skip=${skipAmount}&amount=1&onlyVerified=false`)}`; // Removed userTokenHash here
                        const secondResponse = await fetch(secondCallUrl);

                        if (!secondResponse.ok) {
                            console.warn(`Second call failed at skip ${skipAmount} (getting entry details): ${secondResponse.status}`);
                             setBasicUserData({
                                  name: 'Name Unavailable (Error fetching entry details)',
                                  carColors: '',
                                  isVerifier: 'N/A'
                             });
                        } else {
                            const secondData: { entries: LeaderboardEntry[] } = await secondResponse.json();

                            if (secondData.entries && secondData.entries.length > 0 && secondData.entries[0].userId === targetUserId) {
                                // Found the user's entry in the entries array
                                setBasicUserData({
                                    name: secondData.entries[0].name,
                                    carColors: secondData.entries[0].carColors,
                                    isVerifier: 'N/A' // Cannot determine isVerifier from User ID
                                });
                            } else {
                                 console.warn(`User entry not found in second call entries array at skip ${skipAmount}.`);
                                 setBasicUserData({
                                      name: 'Name Unavailable (Entry details not found)',
                                      carColors: '',
                                      isVerifier: 'N/A'
                                 });
                            }
                        }
                    } else {
                         console.warn(`User entry not found or no position in first call.`);
                         setBasicUserData({
                              name: 'Name Unavailable (No entry found)',
                              carColors: '',
                              isVerifier: 'N/A'
                         });
                    }
                }
            } catch (e: any) {
                 processingError = 'Failed to fetch user basic data from leaderboard.';
                 console.error('leaderboard lookup error:', e);
                 setBasicUserData({
                      name: 'Name Unavailable (Network Error during lookup)',
                      carColors: '',
                      isVerifier: 'N/A'
                 });
            }

        } else {
             // Fallback if ID is not found (shouldn't happen with hardcoded list)
             setBasicUserData({
                  name: 'Name Unavailable (track results missing)',
                  carColors: '',
                  isVerifier: 'N/A'
             });
        }

      } else if (userInputType === 'usertoken') {
        try {
          targetUserId = await sha256(userInput);
          const fetchedBasicData = await fetchUserBasicData(userInput); // Fetch basic data using the token
           // Set basic user data from fetched data
           setBasicUserData(fetchedBasicData);
        } catch (e: any) {
          processingError = 'Failed to process user token or fetch basic data.';
          console.error('Token processing error:', e);
           // Set placeholder basic data on token error
           setBasicUserData({
                name: 'Name Unavailable (Token Error)',
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
          fetchAllUserTrackStats(targetUserId); // onlyVerified is handled internally by fetchUserTrackEntry now

      } else {
          // This case should ideally be covered by processingError now, but keeping as a safeguard
          setError(processingError || 'Could not resolve user ID from the provided input.');
          setLoading(false);
      }

  }, [userInput, userInputType, fetchUserBasicData, fetchAllUserTrackStats, OFFICIAL_TRACKS, PROXY_URL, API_BASE_URL, VERSION]);


    // Effect to set basic user data to 'not found' if no entries are returned after loading
    // This effect is less critical now that basic data is fetched upfront for User ID,
    // but kept as a fallback in case of unexpected API behavior or if the initial lookup fails
    // but track entries are somehow still returned (unlikely but safer).
    useEffect(() => {
        // Only run if resolvedUserId is set, basicUserData is still in the initial or fetching state,
        // loading is finished, and no entries were found in the main fetch.
        if (resolvedUserId && (!basicUserData || basicUserData.name === 'Fetching Name...') && !loading && officialTrackStats.length === 0 && communityTrackStats.length === 0) {
             setBasicUserData({
                 name: 'User Not Found on any tracks',
                 carColors: '',
                 isVerifier: 'N/A',
             });
        }
    }, [resolvedUserId, basicUserData, officialTrackStats, communityTrackStats, loading]); // Depend on these states


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

  // Function to display car colors with copy functionality
  const displayCarColors = (carColors: string) => {
    if (!carColors) return <span className="text-gray-400">No Color Data</span>;
    const colors = carColors.match(/.{1,6}/g);
    if (!colors) return <span className="text-gray-400">Invalid Color Data</span>;
    return (
      <div className="flex gap-2 items-center flex-wrap justify-start">
        {colors.map((c, i) => {
          const hex = `#${c.padEnd(6, '0')}`;
          return (
            <motion.div
              key={i}
              style={{ backgroundColor: hex, cursor: 'pointer' }}
              className="w-4 h-4 rounded-full border border-gray-600" // Added border for visibility on light backgrounds
              title={hex}
              onClick={() => copyToClipboard(hex)}
              whileHover={{ scale: 1.2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            />
            );
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

  // Memoized sorted official track stats
  const sortedOfficialTrackStats = useMemo(() => {
      // Explicitly type the array as LeaderboardEntryWithTrackName[]
      const sortedStats = [...officialTrackStats] as LeaderboardEntryWithTrackName[];

      sortedStats.sort((a, b) => {
          // Helper to handle undefined/NaN values, pushing them to the end
          const compareNumbers = (valA: number | undefined, valB: number | undefined, ascending: boolean) => {
              if (valA === undefined || isNaN(valA)) return 1; // Push undefined/NaN to end
              if (valB === undefined || isNaN(valB)) return -1; // Push undefined/NaN to end
              return ascending ? valA - valB : valB - valA;
          };

          switch (officialSortBy) {
              case 'trackOrder':
                  // No sorting needed, return 0 to maintain original order (relative to each other)
                  // However, the initial fetch order is preserved by the initial state,
                  // so for a true 'trackOrder' sort, we might need to store the original index.
                  // For now, returning 0 means they stay in their current relative order.
                  // A better approach for strict 'trackOrder' might involve mapping and sorting by original index.
                  // Let's assume 'trackOrder' means the order they were received in the initial fetch.
                  return 0;
              case 'reverseOrder':
                   // To reverse, we need to know the original order. Since we don't store it,
                   // we can simply reverse the array once when this sort is selected.
                   // This sort function approach isn't ideal for a true reverse of the *original* fetch order
                   // without storing original indices. Let's implement it as reversing the *current* order.
                   // A more robust solution would store original indices.
                   // For simplicity here, we'll just reverse the array copy directly if this option is selected,
                   // although that mutates the copy which is generally okay in useMemo.
                   // A better way would be to sort by a stored original index.
                   // Let's revisit this if needed. For now, returning 0 means no change within sort.
                   // The actual reversal would happen outside this sort function if we wanted strict original reverse.
                   // Given the current structure, 'reverseOrder' is tricky. Let's interpret it as
                   // sorting by track name descending as a reasonable alternative for 'reverse' feel.
                   // Or, let's just reverse the array copy directly if this option is picked.
                   // Let's try reversing the array copy directly.
                   // This sort function should return a comparison value. Reversing the array should happen outside.
                   // Let's remove 'reverseOrder' as a sort *function* option and handle it by simply reversing the array when the state changes.
                   // Reverting 'reverseOrder' as a sort option and will handle it by reversing the array directly when selected.
                   return 0; // Should not be reached if handled outside sort.

              case 'highestPercent':
                  return compareNumbers(a.percent, b.percent, false); // Descending
              case 'lowestPercent':
                  return compareNumbers(a.percent, b.percent, true); // Ascending
              case 'highestRank':
                  return compareNumbers(a.rank, b.rank, true); // Ascending rank (lower number is higher rank)
              case 'lowestRank':
                  return compareNumbers(a.rank, b.rank, false); // Descending rank (higher number is lower rank)
              case 'fastestTime':
                  return compareNumbers(a.frames, b.frames, true); // Ascending frames (lower frames is faster)
              case 'slowestTime':
                  return compareNumbers(a.frames, b.frames, false); // Descending frames (higher frames is slower)
              case 'alphabetical':
                  return a.trackName.localeCompare(b.trackName); // Ascending alphabetical
              case 'reverseAlphabetical':
                  return b.trackName.localeCompare(a.trackName); // Descending alphabetical
              default:
                  return 0; // Default to original order (no change)
          }
      });

       // Handle the specific 'reverseOrder' case by reversing the array copy once if selected
       if (officialSortBy === 'reverseOrder') {
           sortedStats.reverse();
       }

      return sortedStats;
  }, [officialTrackStats, officialSortBy]); // Depend on original stats and sort preference

  // Memoized sorted community track stats
  const sortedCommunityTrackStats = useMemo(() => {
      // Explicitly type the array as LeaderboardEntryWithTrackName[]
      const sortedStats = [...communityTrackStats] as LeaderboardEntryWithTrackName[];

      sortedStats.sort((a, b) => {
          // Helper to handle undefined/NaN values, pushing them to the end
          const compareNumbers = (valA: number | undefined, valB: number | undefined, ascending: boolean) => {
              if (valA === undefined || isNaN(valA)) return 1; // Push undefined/NaN to end
              if (valB === undefined || isNaN(valB)) return -1; // Push undefined/NaN to end
              // Corrected typo: should be valB - valA
              return ascending ? valA - valB : valB - valA;
          };

          switch (communitySortBy) {
              case 'trackOrder':
                  return 0; // Maintain original order
              case 'reverseOrder':
                  // Handled by reversing the array copy after sort
                  return 0;
              case 'highestPercent':
                  return compareNumbers(a.percent, b.percent, false); // Descending
              case 'lowestPercent':
                  return compareNumbers(a.percent, b.percent, true); // Ascending
              case 'highestRank':
                  return compareNumbers(a.rank, b.rank, true); // Ascending rank
              case 'lowestRank':
                  return compareNumbers(a.rank, b.rank, false); // Descending rank
              case 'fastestTime':
                  return compareNumbers(a.frames, b.frames, true); // Ascending frames
              case 'slowestTime':
                  return compareNumbers(a.frames, b.frames, false); // Descending frames
              case 'alphabetical':
                  return a.trackName.localeCompare(b.trackName); // Ascending alphabetical
              case 'reverseAlphabetical':
                  return b.trackName.localeCompare(a.trackName); // Descending alphabetical
              default:
                  return 0; // Default to original order
          }
      });

       // Handle the specific 'reverseOrder' case by reversing the array copy once if selected
       if (communitySortBy === 'reverseOrder') {
           sortedStats.reverse();
       }

      return sortedStats;
  }, [communityTrackStats, communitySortBy]); // Depend on original stats and sort preference


  // Function to render a list of track stats (used for Official and Community sections)
  const renderTrackStatsList = (stats: LeaderboardEntryWithTrackName[], title: string, sortBy: typeof officialSortBy, setSortBy: typeof setOfficialSortBy) => {
    const sortOptions = [
        { value: 'trackOrder', label: 'Track Order' },
        { value: 'reverseOrder', label: 'Reverse Order' },
        { value: 'highestPercent', label: 'Highest Percent' },
        { value: 'lowestPercent', label: 'Lowest Percent' },
        { value: 'highestRank', label: 'Highest Rank' },
        { value: 'lowestRank', label: 'Lowest Rank' },
        { value: 'fastestTime', label: 'Fastest Time' },
        { value: 'slowestTime', label: 'Slowest Time' },
        { value: 'alphabetical', label: 'Alphabetical' },
        { value: 'reverseAlphabetical', label: 'Reverse Alphabetical' },
    ];

    return (
      <Card className="bg-gray-800/50 text-white border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> {/* Adjusted header for layout */}
              <CardTitle className="text-purple-400">{title}</CardTitle>
              {/* Sort Select */}
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
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
              {stats.length > 0 ? (
                  stats.map((entry, index) => (
                      <motion.div
                          key={entry.id || entry.trackName} // Use a more stable key if ID is missing
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700 pb-3 last:border-b-0 last:pb-0"
                      >
                          <div className="flex-1 mr-4">
                              <p className="font-semibold text-blue-300">{entry.trackName}</p>
                              <p className="text-sm text-gray-300">Time: {formatTime(entry.frames)}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-2 sm:mt-0">
                              {entry.rank !== undefined && <p className="text-sm text-gray-300">Rank: {entry.rank}</p>}
                              {/* Increased decimal places for individual track percent */}
                              {entry.percent !== undefined && <p className="text-sm text-gray-300">Percent: {entry.percent.toFixed(4)}%</p>}
                              <div className="flex items-center gap-1">
                                  {getPosMedal(entry.position) && (
                                       <>
                                           <Tooltip id={`pos-medal-${entry.id || entry.trackName}`}><span className="text-xs">{getPosMedal(entry.position)?.label}</span></Tooltip>
                                           <span
                                               data-tooltip-id={`pos-medal-${entry.id || entry.trackName}`}
                                               className={`text-${getPosMedal(entry.position)?.color} text-lg`}
                                               title={getPosMedal(entry.position)?.label}
                                           >
                                               {getPosMedal(entry.position)?.icon}
                                           </span>
                                      </>
                                  )}
                                   {getMedal(entry.percent) && (
                                      <>
                                           <Tooltip id={`percent-medal-${entry.id || entry.trackName}`}><span className="text-xs">{getMedal(entry.percent)?.label}</span></Tooltip>
                                           <span
                                               data-tooltip-id={`percent-medal-${entry.id || entry.trackName}`}
                                               className={`text-${getMedal(entry.percent)?.color} text-lg`}
                                               title={getMedal(entry.percent)?.label}
                                           >
                                               {getMedal(entry.percent)?.icon}
                                           </span>
                                      </>
                                  )}
                              </div>
                               <VerifiedStateIcon verifiedState={entry.verifiedState} />
                          </div>
                      </motion.div>
                  ))
              ) : (
                  <p className="text-gray-400">No entries found for these tracks.</p>
              )}
          </CardContent>
      </Card>
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
             {!loading && resolvedUserId && (!basicUserData || basicUserData.name.startsWith('Name Unavailable') || basicUserData.name === 'Error fetching track data' || basicUserData.name === 'User Not Found on any tracks') && (
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
                             We could not retrieve user information for the provided User ID from the leaderboard. Try switching to a User Token input. This might also mean the user has no entry.
                         </AlertDescription>
                     </Alert>
                 </motion.div>
             )}
        </AnimatePresence>


        {/* Conditional Display Area */}
        <AnimatePresence mode="wait"> {/* Use mode="wait" to ensure one section exits before the next enters */}
            {displayMode === 'allTrackStats' && (officialTrackStats.length > 0 || communityTrackStats.length > 0 || officialAverageStats || communityAverageStats || overallAverageStats || Object.keys(medalTracks).length > 0) && (
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
                                                      {getPosMedal(overallAverageStats.rawAvgRank) && (
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
                                                      {getMedal(overallAverageStats.rawAvgPercent) && (
                                                           <>
                                                                <Tooltip id="avg-overall-percent-tip"><span className="text-xs">{getMedal(overallAverageStats.rawAvgPercent)?.label}</span></Tooltip>
                                                                <span
                                                                    data-tooltip-id="avg-overall-percent-tip"
                                                                    className={`text-${getMedal(overallAverageStats.rawAvgPercent)?.color} text-xl`}
                                                                >
                                                                    {getMedal(overallAverageStats.rawAvgPercent)?.icon}
                                                                </span>
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
                                                        {getPosMedal(officialAverageStats.rawAvgRank) && (
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
                                                        {officialAverageStats.avgPercent}
                                                         {/* Medals for Official Average Percent (using raw average) */}
                                                        {getMedal(officialAverageStats.rawAvgPercent) && (
                                                             <>
                                                                  <Tooltip id="avg-official-percent-tip"><span className="text-xs">{getMedal(officialAverageStats.rawAvgPercent)?.label}</span></Tooltip>
                                                                  <span
                                                                      data-tooltip-id="avg-official-percent-tip"
                                                                      className={`text-${getMedal(officialAverageStats.rawAvgPercent)?.color} text-xl`}
                                                                  >
                                                                      {getMedal(officialAverageStats.rawAvgPercent)?.icon}
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
                                                        {getPosMedal(communityAverageStats.rawAvgRank) && (
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
                                                        {getMedal(communityAverageStats.rawAvgPercent) && (
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

                     {/* Medal Counts Display */}
                     {Object.keys(medalTracks).length > 0 && ( // Use medalTracks here
                         <Card className="bg-gray-800/50 text-white border-purple-500/30">
                             <CardHeader>
                                 <CardTitle className="text-purple-400">Medal Counts</CardTitle>
                                 <CardDescription className="text-gray-300">Hover over a medal to see the tracks you earned it on.</CardDescription> {/* Updated description */}
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
                                                         {tracks.map(track => (
                                                             <li key={track.trackName} className="truncate">{track.trackName}</li>
                                                         ))}
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
                     {renderTrackStatsList(sortedOfficialTrackStats as LeaderboardEntryWithTrackName[], "Official Track Entries", officialSortBy, setOfficialSortBy)} {/* Pass sorted data and sorting state */}

                     {/* Community Track Stats List */}
                     {renderTrackStatsList(sortedCommunityTrackStats as LeaderboardEntryWithTrackName[], "Community Track Entries", communitySortBy, setCommunitySortBy)} {/* Pass sorted data and sorting state */}

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
