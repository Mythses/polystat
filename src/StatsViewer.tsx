import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, Trophy, User, Circle, CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, File, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Tooltip } from 'react-tooltip';
import { AlertCircle, TriangleAlert } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeaderboardEntry { id: number; userId: string; name: string; carColors: string; frames: number; verifiedState: number; position: number; rank?: number; percent?: number; }
interface LeaderboardData { total: number; entries: LeaderboardEntry[]; userEntry: LeaderboardEntry | null; }
interface RecordingData { recording: string; frames: number; verifiedState: number; carColors: string; }

const API_BASE_URL = 'https://vps.kodub.com:43273/leaderboard';
const RECORDING_API_BASE_URL = 'https://vps.kodub.com:43273/recordings';
const PROXY_URL = 'https://hi-rewis.maxicode.workers.dev/?url=';
const VERSION = '0.5.0';
const AMOUNT = 10;
const INPUT_DEBOUNCE_DELAY = 500; // milliseconds

const CopyPopup = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 1, y: 0 }}
    className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm px-4 py-2 rounded-md shadow-lg z-50"
  >
    Copied: {text}
  </motion.div>
);

// Function to calculate SHA-256 hash
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const getMedal = (percent: number | undefined) => {
  if (percent === undefined || typeof percent !== 'number' || isNaN(percent)) return null; // Added isNaN check
  if (percent <= 0.005) return { icon: '♦', label: 'Diamond', color: 'cyan', type: 'mineral' };
  if (percent <= 0.5) return { icon: '♦', label: 'Emerald', color: 'green', type: 'mineral' };
  if (percent <= 5) return { icon: '♦', label: 'Gold', color: 'gold', type: 'mineral' };
  if (percent <= 15) return { icon: '♦', label: 'Silver', color: 'silver', type: 'mineral' };
  if (percent <= 25) return { icon: '♦', label: 'Bronze', color: 'bronze', type: 'mineral' };
  return null;
};

const getPosMedal = (position: number | undefined) => {
  if (position === undefined || typeof position !== 'number' || isNaN(position)) return null; // Added isNaN check
  if (position === 1) return { icon: '✦', label: 'WR', color: 'black', type: 'rank' };
  if (position <= 5) return { icon: '✦', label: 'Podium', color: 'white', type: 'rank' };
  return null;
};

const StatsViewer = () => {
  const [userInput, setUserInput] = useState('');
  const [userInputType, setUserInputType] = useState<'userid' | 'usertoken' | 'rank'>('userid');
  const [userId, setUserId] = useState(''); // This state will now primarily store the *resolved* user ID for display/pagination
  const [trackId, setTrackId] = useState('');
  const [statsData, setStatsData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userPage, setUserPage] = useState<number | null>(null);
  const [goToPosition, setGoToPosition] = useState('');
  const totalPagesRef = useRef(1);
  const [userData, setUserData] = useState<LeaderboardEntry | null>(null);
  const [onlyVerified, setOnlyVerified] = useState(true);
  const [recordingData, setRecordingData] = useState<(RecordingData | null)[] | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialFetchDoneRef = useRef(false); // Flag to prevent initial fetch on mount

  const formatTime = (frames: number) => {
    const h = Math.floor(frames / 3600000);
    const m = Math.floor((frames % 3600000) / 60000);
    const s = Math.floor((frames % 60000) / 1000);
    const ms = frames % 1000;
    return `${h > 0 ? `${h}h  ` : ''}${m > 0 || h > 0 ? `${m}m  ` : ''}${s}.${ms.toString().padStart(3, '0')}s`;
  };

  // Function to fetch leaderboard data for a specific page
  const fetchLeaderboardPage = useCallback(async (page = 1, targetTrackId: string, targetOnlyVerified: boolean, targetUserId: string | null = null) => {
    setLoading(true);
    setError(null);
    setCurrentPage(page);
    setStatsData(null); // Clear previous leaderboard data
    setRecordingData(null); // Clear previous recording data

    try {
      const skip = (page - 1) * AMOUNT;
      // Include userTokenHash if available, but this fetch is primarily for the list
      const leaderboardUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${targetTrackId}&skip=${skip}&amount=${AMOUNT}&onlyVerified=${targetOnlyVerified}${targetUserId ? `&userTokenHash=${targetUserId}` : ''}`)}`;
      const response = await fetch(leaderboardUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard data: ${response.status}`);
      }
      const data: LeaderboardData = await response.json();

      // Ensure total is a number, default to 0 if not
      const totalEntries = typeof data.total === 'number' ? data.total : 0;
      totalPagesRef.current = Math.ceil(totalEntries / AMOUNT);


      // Fetch recording data for entries on this page
      if (data.entries.length > 0) {
        const recordingIds = data.entries.map((entry) => entry.id).join(',');
        const recordingUrl = `${PROXY_URL}${encodeURIComponent(RECORDING_API_BASE_URL + `?version=${VERSION}&recordingIds=${recordingIds}`)}`;
        const recordingResponse = await fetch(recordingUrl);
        setRecordingData(recordingResponse.ok ? await recordingResponse.json() : Array(data.entries.length).fill(null));
      } else {
        setRecordingData([]);
      }

      // Enrich entries with calculated rank and percent
      const enrichedEntries = data.entries.map((entry, index) => {
          // Rank is based on the index in the current page + the number of skipped entries + 1
          const rank = skip + index + 1;
          // Calculate percent only if totalEntries > 0 and rank is a valid number
          const percent = totalEntries > 0 && typeof rank === 'number' ? (rank / totalEntries) * 100 : undefined;

          return {
              ...entry,
              rank: rank,
              percent: percent
          };
      });


      setStatsData({ ...data, entries: enrichedEntries }); // Update statsData with enriched entries

    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching leaderboard data.');
      setStatsData(null);
      setRecordingData(null);
    } finally {
      // Ensure loading is set to false regardless of success or failure
      setLoading(false);
    }
  }, [AMOUNT, PROXY_URL, API_BASE_URL, VERSION, RECORDING_API_BASE_URL]); // Dependencies for fetchLeaderboardPage

  // Function to fetch specific user data based on resolved userId and trackId
  const fetchAndSetUserData = useCallback(async (targetUserId: string, targetTrackId: string, targetOnlyVerified: boolean) => {
       setUserData(null); // Clear previous user data
       setUserPage(null); // Clear user page

       if (!targetUserId || !targetTrackId) {
           setUserData(null);
           setUserPage(null);
           return null; // Return null if input is invalid
       }

       try {
           // First, fetch just the userEntry to get the position and total count
           const initialUserFetchUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${targetTrackId}&skip=0&amount=1&onlyVerified=${targetOnlyVerified}&userTokenHash=${targetUserId}`)}`;
           const initialUserResponse = await fetch(initialUserFetchUrl);

           if (!initialUserResponse.ok) {
               console.warn(`Initial user fetch failed: ${initialUserResponse.status}`);
               setUserData(null);
               setUserPage(null);
               return null;
           }

           const initialUserData: LeaderboardData = await initialUserResponse.json();

           // Extract user position and total entries from the initial fetch
           const userPosition = initialUserData.userEntry && typeof initialUserData.userEntry.position === 'number'
                                ? initialUserData.userEntry.position
                                : undefined;
           const totalEntries = typeof initialUserData.total === 'number' ? initialUserData.total : 0;


           // Now, fetch the specific entry using the determined position (if available)
           // We still need this second fetch to get the full entry details like name, colors, frames
           const specificUserSkip = typeof userPosition === 'number' ? Math.max(0, userPosition - 1) : 0; // Use position for skip if available
           const specificUserFetchUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${targetTrackId}&skip=${specificUserSkip}&amount=1&onlyVerified=${targetOnlyVerified}${targetUserId ? `&userTokenHash=${targetUserId}` : ''}`)}`;
           const specificUserResponse = await fetch(specificUserFetchUrl);

           if (!specificUserResponse.ok) {
               console.warn(`Specific user fetch failed: ${specificUserResponse.status}`);
               setUserData(null);
               setUserPage(null);
               return null;
           }

           const specificUserData: LeaderboardData = await specificUserResponse.json();

           // Ensure entries array exists and contains at least one entry
           if (specificUserData.entries && specificUserData.entries.length > 0) {
               const userEntry = specificUserData.entries[0]; // The user's entry should be the first (and only) one

                // Use the userPosition from the initial fetch for rank calculation
                const rank = userPosition;
                // Calculate percent only if totalEntries > 0 and rank is a valid number
                const percent = totalEntries > 0 && typeof rank === 'number' ? (rank / totalEntries) * 100 : undefined;


                const finalUserEntry: LeaderboardEntry = {
                    id: userEntry.id,
                    userId: userEntry.userId || 'ID Unavailable',
                    name: userEntry.name || 'Name Unavailable',
                    carColors: userEntry.carColors || '',
                    frames: userEntry.frames,
                    verifiedState: userEntry.verifiedState,
                    position: userEntry.position, // Keep original position from second fetch if needed elsewhere
                    rank: rank, // Assign rank from initial fetch
                    percent: percent // Assign calculated percent
                };
                setUserData(finalUserEntry);
                // Only set userPage if rank is a valid number
                if (typeof rank === 'number') {
                    setUserPage(Math.ceil(rank / AMOUNT));
                } else {
                    setUserPage(null);
                }
                return finalUserEntry; // Return the fetched user data
           } else {
               console.warn('Specific user fetch returned no entries.');
               setUserData(null);
               setUserPage(null);
               return null;
           }

       } catch (err: any) {
           console.error('Error in fetchAndSetUserData:', err);
           setUserData(null);
           setUserPage(null);
           return null;
       }
   }, [AMOUNT, PROXY_URL, API_BASE_URL, VERSION]); // Dependencies for fetchAndSetUserData


  // Combined function to process input, fetch user data, and then fetch leaderboard data
  const processUserInputAndFetchData = useCallback(async () => {
      setError(null);
      setUserId(''); // Clear resolved userId when input changes
      setUserData(null); // Clear user data when input changes
      setStatsData(null); // Clear stats data when input changes
      setRecordingData(null); // Clear recording data when input changes


      if (!userInput || !trackId) {
         if (!trackId && userInput) {
             setError('Please enter a Track ID.');
         }
        setLoading(false);
        return;
      }

      setLoading(true); // Set loading true when processing starts

      let targetUserId = '';
      let processingError: string | null = null; // Use a local variable for errors during processing

      if (userInputType === 'userid') {
        targetUserId = userInput;
      } else if (userInputType === 'usertoken') {
        try {
          targetUserId = await sha256(userInput);
        } catch (e: any) {
          processingError = 'Failed to hash user token.';
          console.error('Hashing error:', e);
        }
      } else if (userInputType === 'rank') {
        const rank = parseInt(userInput, 10);
        if (!isNaN(rank) && rank > 0) {
          try {
            // Fetch the entry at rank - 1 with amount 1 to get the user ID
            const skip = Math.max(0, rank - 1);
            const rankLookupUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=${skip}&amount=1&onlyVerified=${onlyVerified}`)}`;
            const response = await fetch(rankLookupUrl);

            if (!response.ok) {
              throw new Error(`Failed to fetch user by rank: ${response.status}`);
            }

            const data: LeaderboardData = await response.json();

            if (data.entries && data.entries.length > 0) {
              targetUserId = data.entries[0].userId;
            } else {
              processingError = `No user found at rank ${rank}.`;
            }
          } catch (err: any) {
            processingError = err.message || 'An error occurred while fetching user by rank.';
          }
        } else {
          processingError = 'Please enter a valid positive number for Rank.';
        }
      }

      // If there was a processing error, set the error state and stop
      if (processingError) {
          setError(processingError);
          setLoading(false);
          return;
      }

      // If we successfully determined a targetUserId and have a trackId, proceed with fetching
      if (targetUserId && trackId) {
          setUserId(targetUserId); // Set the resolved userId for display/pagination

          // Fetch user specific data first
          const fetchedUserData = await fetchAndSetUserData(targetUserId, trackId, onlyVerified);

          // Then fetch leaderboard data for the first page, including the targetUserId
          // Pass the targetUserId to fetchLeaderboardPage so it can potentially highlight the user
          fetchLeaderboardPage(1, trackId, onlyVerified, targetUserId);

      } else {
          setLoading(false);
      }

  }, [userInput, userInputType, trackId, onlyVerified, fetchAndSetUserData, fetchLeaderboardPage, PROXY_URL, API_BASE_URL, VERSION]); // Dependencies for processUserInputAndFetchData


  // Effect to trigger the combined fetch function with debounce
  useEffect(() => {
    // Prevent initial fetch on component mount
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      setLoading(false); // Ensure loading is off initially
      return;
    }

    const handler = setTimeout(() => {
        processUserInputAndFetchData();
    }, INPUT_DEBOUNCE_DELAY); // Debounce delay

    // Cleanup function to clear the timeout if the component unmounts or inputs change again
    return () => {
        clearTimeout(handler);
         // setLoading(false); // Removed this here, as it's handled by processUserInputAndFetchData
    };

  }, [userInput, userInputType, trackId, onlyVerified, processUserInputAndFetchData]); // Dependencies for the debounced effect


  const handlePageChange = (newPage: number) => {
      // Only proceed if not currently loading and we have a trackId
      // Pass the current resolved userId to highlight it on the new page
      if (!loading && trackId) {
         fetchLeaderboardPage(newPage, trackId, onlyVerified, userId); // Changed back to fetchData for pagination
      } else if (loading) {
          setError('Already loading data. Please wait.');
      } else {
          setError('Please enter Track ID first.');
      }
  };

  const handleGoToPage = () => {
    const pos = parseInt(goToPosition, 10);
    // Only proceed if not currently loading, inputs are valid, and we have a trackId
    if (!loading && trackId && !isNaN(pos) && pos > 0 && pos <= totalPagesRef.current) {
      // Pass the current resolved userId to highlight it on the new page
      fetchLeaderboardPage(Math.ceil(pos / AMOUNT), trackId, onlyVerified, userId); // Changed back to fetchData
      setGoToPosition('');
    } else if (loading) {
        setError('Already loading data. Please wait.');
    } else if (!trackId) {
        setError('Please enter Track ID first.');
    }
    else {
      setError('Invalid position.');
    }
  };

   const inputPlaceholder = userInputType === 'userid' ? 'User ID' :
                             userInputType === 'usertoken' ? 'User Token' :
                             'Rank';

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

  const displayCarColors = (carColors: string) => {
    if (!carColors) return 'No Color Data';
    const colors = carColors.match(/.{1,6}/g);
    if (!colors) return 'Invalid Color Data';
    return (
      <div className="flex gap-2 items-center flex-wrap justify-start">
        {colors.map((c, i) => {
          const hex = `#${c.padEnd(6, '0')}`;
          return (
            <motion.div
              key={i}
              style={{ backgroundColor: hex, cursor: 'pointer' }}
              className="w-4 h-4 rounded-full"
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
          className="text-blue-400 font-mono text-xs truncate p-0 relative"
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  const VerifiedStateIcon = ({ verifiedState }: { verifiedState: number }) => {
    const icons = [
      <Circle className="w-4 h-4 text-gray-400" />,
      <CheckCircle className="w-4 h-4 text-green-500" />,
      <Circle className="w-4 h-4 text-gray-400" />,
    ];
    return icons[verifiedState] || icons[2];
  };

  const displayRecording = (rec: string | null) => {
    const display = rec ? (
      <Button
        variant="link"
        className="text-blue-400 font-mono text-sm truncate p-0 relative"
        onClick={() => { if (rec) { copyToClipboard(rec); } }}
      >
        <span className="flex items-center gap-1">
          <File className="w-4 h-4 inline-block" />
          {rec}
        </span>
      </Button>
    ) : (
      <span className="text-gray-400">No Data</span>
    );

    return (
      <>
        {display}
      </>
    );
  };

  // Determine if the current error suggests an input type issue
  const showErrorSuggestion = error && (
      error.includes("User not found") ||
      error.includes("Could not find user data") ||
      error.includes("No user found at rank") ||
      error.includes("valid positive number for Rank") ||
      error.includes("Failed to hash user token") ||
      // Also check for generic fetch errors if inputs are present, as it could be a type issue
      (error.includes("Failed to fetch") && (userInput || trackId))
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4 md:p-8">
      {copiedText && <CopyPopup text={copiedText} />}
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Polystats
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
           <Select onValueChange={(value: 'userid' | 'usertoken' | 'rank') => setUserInputType(value)} defaultValue={userInputType}>
               <SelectTrigger className="w-[180px] bg-black/20 text-white border-purple-500/30 focus:ring-purple-500/50">
                   <SelectValue placeholder="Select Input Type" />
               </SelectTrigger>
               <SelectContent className="bg-gray-800 text-white border-purple-500/30">
                   <SelectItem value="userid">User ID</SelectItem>
                   <SelectItem value="usertoken">User Token</SelectItem>
                   <SelectItem value="rank">Rank</SelectItem>
               </SelectContent>
           </Select>

          <Input
            type={userInputType === 'rank' ? 'number' : 'text'}
            placeholder={inputPlaceholder}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex-1 bg-black/20 text-white border-purple-500/30 placeholder:text-gray-500 focus:ring-purple-500/50"
          />
          <Input
            type="text"
            placeholder="Track ID"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="flex-1 bg-black/20 text-white border-purple-500/30 placeholder:text-gray-500 focus:ring-purple-500/50"
          />
          <div className="flex items-center space-x-2">
            <Switch
              checked={onlyVerified}
              onCheckedChange={setOnlyVerified}
              className="data-[state=checked]:bg-purple-500 data-[state=unchecked]:bg-gray-700 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-colors duration-200"
            />
            <Label htmlFor="airplane-mode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white">
              Only Verified
            </Label>
          </div>
          {/* The search button now triggers the combined processing and fetching */}
          <Button
            onClick={processUserInputAndFetchData}
            disabled={loading || !userInput || !trackId} // Disable if loading or inputs are empty
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full transition-all duration-300 hover:from-purple-600 hover:to-blue-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-0"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Conditional suggestion below the error message with box and border */}
        {showErrorSuggestion && (
             <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm text-center mt-2 p-3 border border-yellow-400 rounded-md bg-yellow-400/20"> {/* Increased opacity */}
                 <TriangleAlert className="h-4 w-4" /> {/* Changed icon */}
                 <span>Suggestion: Please double-check the input value and ensure the correct Input Type is selected (User ID, User Token, or Rank).</span>
             </div>
        )}


        {statsData && statsData.entries && (
          <div className="space-y-4">
            {userData ? (
              <>
                <div className="text-center">
                  <p className="text-lg sm:text-xl font-semibold text-purple-300 tracking-wide mb-2 flex items-center justify-center gap-2">
                    <User className="w-5 h-5" />
                    Your Stats
                  </p>
                  <p className="text-gray-400">Your personal performance.</p>
                </div>
                <Card className="bg-black/20 text-white border-purple-500/30 shadow-lg w-full">
                  <CardHeader>
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-purple-400 text-center flex items-center justify-center gap-2 flex-wrap">
                      {/* Display rank with fallback */}
                      {getPosMedal(userData.rank as number | undefined) ? (
                        <>
                          <span data-tooltip-id="statsPosMedal"
                            data-tooltip-content={getPosMedal(userData.rank as number | undefined)?.label} style={{ color: getPosMedal(userData.rank as number | undefined)?.color }}>
                            {getPosMedal(userData.rank as number | undefined)?.icon}
                          </span>
                          <Tooltip id="statsPosMedal" className="rounded-md" style={{ backgroundColor: "rgb(27, 21, 49)", color: getPosMedal(userData.percent as number | undefined)?.color, fontSize: "1rem", padding: "0.25rem 0.5rem" }} />
                        </>
                      ) : null}
                      <span className='truncate'>{userData.name || 'Name Unavailable'}</span>
                      {/* Display medal based on percent with fallback */}
                      {getMedal(userData.percent as number | undefined) ? (
                        <>
                          <span data-tooltip-id="statsMedal"
                            data-tooltip-content={getMedal(userData.percent as number | undefined)?.label} style={{ color: getMedal(userData.percent as number | undefined)?.color }}>
                            {getMedal(userData.percent as number | undefined)?.icon}
                          </span>
                          <Tooltip id="statsMedal" className="rounded-md" style={{ backgroundColor: "rgb(27, 21, 49)", color: getMedal(userData.percent as number | undefined)?.color, fontSize: "1rem", padding: "0.25rem 0.5rem" }} />
                        </>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="text-xl text-blue-400 text-center">
                      {formatTime(userData.frames)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {/* Display rank with fallback */}
                      <p><span className="font-semibold text-gray-300">Rank:</span> {typeof userData.rank === 'number' ? userData.rank : 'N/A'}</p>
                       {/* Display top % with fallback and formatting */}
                      <p><span className="font-semibold text-gray-300">Top:</span> {typeof userData.percent === 'number' ? `${userData.percent.toFixed(4)}%` : 'N/A'}</p>
                      <p><span className="font-semibold text-gray-300">User ID:</span> {userData.userId || 'ID Unavailable'}</p>
                      <p><span className="font-semibold text-gray-300">Car Colors:</span> {displayCarColors(userData.carColors || '')}</p>
                      <p><span className="font-semibold text-gray-300">Frames:</span> <span className="text-purple-400">{userData.frames} ({formatTime(userData.frames)})</span></p>
                      <p className="flex items-center gap-1"><span className="font-semibold text-gray-300">Verified:</span><VerifiedStateIcon verifiedState={userData.verifiedState} /></p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-gray-300">Recording:</p>
                      <Card className="bg-gray-800/50 border-gray-700 w-full">
                        <CardContent className="p-4 overflow-x-auto no-scroll">
                          {recordingData && recordingData[0] ? displayRecording(recordingData[0].recording) : displayRecording(null)}
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-black/20 text-white border-purple-500/30 shadow-lg w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-400">
                    <User className="w-5 h-5" />
                    Your Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Your stats are not available.</p>
                </CardContent>
              </Card>
            )}
            <>
              <div className="text-center">
                <p className="text-lg sm:text-xl font-semibold text-blue-300 tracking-wide mb-2 flex items-center justify-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Leaderboard
                </p>
                <p className="text-gray-400">Total Entries: {statsData?.total ?? 'N/A'}</p>
              </div>
              <Card className="bg-black/20 text-white border-purple-500/30 shadow-lg w-full">
                <CardHeader />
                <CardContent>
                  <div className="space-y-4">
                    {statsData?.entries.map((entry, index) => {
                      const medal = getMedal(entry.percent as number | undefined);
                      const posMedal = getPosMedal(entry.rank as number | undefined);
                      let userBoxStyle = 'bg-gray-800/50 border border-gray-700';
                      let userTextStyle = '';
                      if (entry.userId === userId) {
                        if (posMedal) {
                          userBoxStyle = `bg-[${posMedal.color}]/20 border-2 border-[${posMedal.color}]/50`;
                          userTextStyle = `text-[${posMedal.color}]`;
                        } else if (medal) {
                          userBoxStyle = `bg-[${medal.color}]/20 border-2 border-[${medal.color}]/50`;
                          userTextStyle = `text-[${medal.color}]`;
                        }
                        else {
                          userBoxStyle = 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-2 border-purple-500/50';
                          userTextStyle = 'text-white';
                        }
                      }

                      return (
                        <div key={entry.id} className={cn(
                          'p-4 rounded-lg',
                          userBoxStyle,
                          'overflow-hidden'
                        )}>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-gray-300">Rank:</span>
                               {/* Display rank with fallback */}
                              {posMedal ? (
                                <span data-tooltip-id={`posMedal-${entry.id}`} data-tooltip-content={posMedal?.label} style={{ color: posMedal?.color }}>{posMedal.icon}</span>
                              ) : null}
                              <span className={userTextStyle}>{typeof entry.rank === 'number' ? entry.rank : 'N/A'}</span>
                            </div>
                            <div><span className="font-semibold text-gray-300">Top:</span>
                               {/* Display top % with fallback and formatting */}
                              <span className={userTextStyle}>{typeof entry.percent === 'number' ? `${entry.percent.toFixed(4)}%` : 'N/A'}</span>
                              {medal && medal.type === 'mineral' ? (
                                <span className="ml-1" data-tooltip-id={`medal-${entry.id}`} data-tooltip-content={medal?.label} style={{ color: medal?.color }}>{medal ? medal.icon : ''}</span>
                              ) : null}
                              <Tooltip id={`medal-${entry.id}`} className="rounded-md" style={{ backgroundColor: "rgb(27, 21, 49)", color: medal?.color, fontSize: "1rem", padding: "0.25rem 0.5rem" }} />
                              <Tooltip id={`posMedal-${entry.id}`} className="rounded-md" style={{ backgroundColor: "rgb(27, 21, 49)", color: posMedal?.color, fontSize: "1rem", padding: "0.25rem 0.5rem" }} />
                            </div>
                            <div><span className="font-semibold text-gray-300 truncate">Name:</span> <span className={userTextStyle + ' truncate'}>{entry.name}</span></div>
                            <div><span className="font-semibold text-gray-300">User ID:</span> <span className={userTextStyle}>{entry.userId}</span></div>
                            <div><span className="font-semibold text-semibold text-gray-300">Car Colors:</span> {displayCarColors(entry.carColors)}</div>
                            <div><span className="font-semibold text-gray-300">Frames:</span> <span className={userTextStyle}>{entry.frames}</span> (<span className={userTextStyle}>{formatTime(entry.frames)}</span>)</div>
                            <div className="flex items-center gap-1"><span className="font-semibold text-gray-300">Verified:</span><VerifiedStateIcon verifiedState={entry.verifiedState} /></div>
                            <div className="overflow-x-auto no-scroll"><span className="font-semibold text-gray-300">Recording:</span>{recordingData && recordingData[index] ? displayRecording(recordingData[index]?.recording || null) : displayRecording(null)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={currentPage === 1 || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-gray-300">Page {currentPage} of {totalPagesRef.current}</span>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPagesRef.current || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(Math.min(currentPage + 10, totalPagesRef.current))} disabled={currentPage + 10 > totalPagesRef.current || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                        +{10}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(totalPagesRef.current)} disabled={currentPage === totalPagesRef.current || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                    {userPage && (
                      <Button variant="outline" onClick={() => handlePageChange(userPage)} disabled={loading} className="bg-purple-900/50 text-white hover:bg-purple-800/50 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                        Go to Your Page ({userPage})
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Go to pos."
                        value={goToPosition}
                        onChange={(e) => setGoToPosition(e.target.value)}
                        className="w-24 bg-gray-800/50 text-white border-gray-700 placeholder:text-gray-500 focus:ring-purple-500/50"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }}
                      />
                      <Button onClick={handleGoToPage} disabled={loading} className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">
                        Go
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          </div>
        )}
      </div>
      <div className="text-center text-gray-500 text-sm mt-4">
        <p>Version: {VERSION}</p>
        <p>
          Play the game: <a href="https://www.kodub.com/apps/polytrack" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Polytrack</a>
        </p>
      </div>
      <style>{
        `.no-scroll::-webkit-scrollbar {
          display: none;
        }
        .no-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }`
      }</style>
    </div>
  );
};

export default StatsViewer;
