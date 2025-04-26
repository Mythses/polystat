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
import { AlertCircle } from 'lucide-react';

interface LeaderboardEntry { id: number; userId: string; name: string; carColors: string; frames: number; verifiedState: number; position: number; rank?: number; percent?: number; }
interface LeaderboardData { total: number; entries: LeaderboardEntry[]; userEntry: LeaderboardEntry | null; }
interface RecordingData { recording: string; frames: number; verifiedState: number; carColors: string; }

const API_BASE_URL = 'https://vps.kodub.com:43273/leaderboard';
const RECORDING_API_BASE_URL = 'https://vps.kodub.com:43273/recordings';
const PROXY_URL = 'https://hi-rewis.maxicode.workers.dev/?url=';
const VERSION = '0.5.0';
const AMOUNT = 10;

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

const getMedal = (percent: number | undefined) => {
  if (percent === undefined) return null;
  if (percent <= 0.005) return { icon: '♦', label: 'Diamond', color: 'cyan', type: 'mineral' };
  if (percent <= 0.5) return { icon: '♦', label: 'Emerald', color: 'green', type: 'mineral' };
  if (percent <= 5) return { icon: '♦', label: 'Gold', color: 'gold', type: 'mineral' };
  if (percent <= 15) return { icon: '♦', label: 'Silver', color: 'silver', type: 'mineral' };
  if (percent <= 25) return { icon: '♦', label: 'Bronze', color: 'bronze', type: 'mineral' };
  return null;
};

const getPosMedal = (position: number | undefined) => {
  if (position === undefined) return null;
  if (position === 1) return { icon: '✦', label: 'WR', color: 'black', type: 'rank' };
  if (position <= 5) return { icon: '✦', label: 'Podium', color: 'white', type: 'rank' };
  return null;
};

const StatsViewer = () => {
  const [userId, setUserId] = useState('');
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

  const formatTime = (frames: number) => {
    const h = Math.floor(frames / 3600000);
    const m = Math.floor((frames % 3600000) / 60000);
    const s = Math.floor((frames % 60000) / 1000);
    const ms = frames % 1000;
    return `${h > 0 ? `${h}h  ` : ''}${m > 0 || h > 0 ? `${m}m  ` : ''}${s}.${ms.toString().padStart(3, '0')}s`;
  };

  const fetchStats = useCallback(async (page = 1) => {
    if (!userId) { setError('Please enter a User ID.'); return; }
    if (!trackId) { setError('Please enter a Track ID.'); return; }

    setLoading(true);
    setError(null);
    setStatsData(null);
    setCurrentPage(page);
    setUserData(null);
    setRecordingData(null);

    try {
      const skip = (page - 1) * AMOUNT;
      const leaderboardUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=${skip}&amount=${AMOUNT}&onlyVerified=${onlyVerified}&userTokenHash=${userId}`)}`;
      const response = await fetch(leaderboardUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard data: ${response.status}`);
      }
      const data: LeaderboardData = await response.json();
      totalPagesRef.current = Math.ceil(data.total / AMOUNT);

      let userEntry = data.userEntry;

      if (userEntry) {
        const userSkip = Math.max(0, Math.floor((userEntry.position - 10 - 1) / AMOUNT) * AMOUNT);
        const userAmount = 20;
        const userUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=${userSkip}&amount=${userAmount}&onlyVerified=${onlyVerified}&userTokenHash=${userId}`)}`;
        const userResponse = await fetch(userUrl);
        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user data: ${userResponse.status}`);
        }
        const uData: LeaderboardData = await userResponse.json();
        const foundUser = uData.entries.find((e) => e.userId === userId);
        if (foundUser) {
          setUserData({ ...foundUser, rank: uData.userEntry?.position || 0, percent: ((uData.userEntry?.position || 0) / data.total) * 100 });
        }
        setUserPage(Math.ceil(userEntry.position / AMOUNT));
      }

      const enrichedEntries = await Promise.all(
        data.entries.map(async (entry) => {
          const entryUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=0&amount=1&onlyVerified=${onlyVerified}&userTokenHash=${entry.userId}`)}`;
          const entryResponse = await fetch(entryUrl);
          if (!entryResponse.ok) {
            console.warn(`Failed to fetch entry data for user ${entry.userId}: ${entryResponse.status}`);
            return { ...entry, rank: 0, percent: 0 }; // Return entry with default values
          }
          const result = await entryResponse.json();
          return {
            ...entry,
            rank: result.userEntry?.position || 0,
            percent: ((result.userEntry?.position || 0) / data.total) * 100
          };
        })
      );
      data.entries = enrichedEntries;

      if (data.entries.length > 0) {
        const recordingIds = data.entries.map((entry) => entry.id).join(',');
        const recordingUrl = `${PROXY_URL}${encodeURIComponent(RECORDING_API_BASE_URL + `?version=${VERSION}&recordingIds=${recordingIds}`)}`;
        const recordingResponse = await fetch(recordingUrl);
        setRecordingData(recordingResponse.ok ? await recordingResponse.json() : Array(data.entries.length).fill(null));
      } else {
        setRecordingData([]);
      }

      setStatsData(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.'); // Ensure err is always an object
    } finally {
      setLoading(false);
    }
  }, [userId, trackId, onlyVerified]);


  useEffect(() => { if (trackId && userId) fetchStats(1); }, [trackId, userId, fetchStats]);

  const handlePageChange = (newPage: number) => fetchStats(newPage);

  const handleGoToPage = () => {
    const pos = parseInt(goToPosition, 10);
    if (!isNaN(pos) && pos > 0 && pos <= totalPagesRef.current) {
      fetchStats(Math.ceil(pos / AMOUNT));
      setGoToPosition('');
    } else {
      setError('Invalid position.');
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4 md:p-8">
      {copiedText && <CopyPopup text={copiedText} />}
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Polystats
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Input
            type="text"
            placeholder="User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="flex-1 bg-black/20 text-white border-purple-500/30 placeholder:text-gray-500 focus:ring-purple-500/50"
            onKeyDown={(e) => { if (e.key === 'Enter') fetchStats(1); }}
          />
          <Input
            type="text"
            placeholder="Track ID"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
            className="flex-1 bg-black/20 text-white border-purple-500/30 placeholder:text-gray-500 focus:ring-purple-500/50"
            onKeyDown={(e) => { if (e.key === 'Enter') fetchStats(1); }}
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
          <Button
            onClick={() => fetchStats(1)}
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-full transition-all duration-300 hover:from-purple-600 hover:to-blue-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                      {getPosMedal(userData.rank) ? (
                        <>
                          <span data-tooltip-id="statsMedal"
                            data-tooltip-content={getPosMedal(userData.rank)?.label} style={{ color: getPosMedal(userData.rank)?.color }}>
                            {getPosMedal(userData.rank)?.icon}
                          </span>
                        </>
                      ) : null}
                      <span className='truncate'>{userData.name}</span>
                      {getMedal(userData.percent ?? 0) ? (
                        <>
                          <span data-tooltip-id="statsMedal"
                            data-tooltip-content={getMedal(userData.percent ?? 0)?.label} style={{ color: getMedal(userData.percent ?? 0)?.color }}>
                            {getMedal(userData.percent ?? 0)?.icon}
                          </span>
                           <Tooltip id="statsMedal" className="rounded-md" style={{ backgroundColor: "rgb(27, 21, 49)", color: getMedal(userData.percent ?? 0)?.color, fontSize: "1rem", padding: "0.25rem 0.5rem" }} />
                        </>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="text-xl text-blue-400 text-center">
                      {formatTime(userData.frames)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <p><span className="font-semibold text-gray-300">Rank:</span> {userData.rank || 'N/A'}</p>
                      <p><span className="font-semibold text-gray-300">Top:</span> {userData.percent ? userData.percent.toFixed(4) : 'N/A'}%</p>
                      <p><span className="font-semibold text-gray-300">User ID:</span> {userData.userId}</p>
                      <p><span className="font-semibold text-gray-300">Car Colors:</span> {displayCarColors(userData.carColors)}</p>
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
                <p className="text-gray-400">Total Entries: {statsData.total}</p>
              </div>
              <Card className="bg-black/20 text-white border-purple-500/30 shadow-lg w-full">
                <CardHeader />
                <CardContent>
                  <div className="space-y-4">
                    {statsData.entries.map((entry, index) => {
                      const medal = getMedal(entry.percent ?? 0);
                      const posMedal = getPosMedal(entry.rank);
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
                              {posMedal ? (
                                <span data-tooltip-id={`posMedal-${entry.id}`} data-tooltip-content={posMedal?.label} style={{ color: posMedal?.color }}>{posMedal.icon}</span>
                              ) : null}
                              <span className={userTextStyle}>{entry.rank}</span>
                            </div>
                            <div><span className="font-semibold text-gray-300">Top:</span> <span className={userTextStyle}>{entry.percent ? entry.percent.toFixed(4) : 'N/A'}%</span>
                              {medal && medal.type === 'mineral' ? (
                                <span className="ml-1" data-tooltip-id={`medal-${entry.id}`} data-tooltip-content={medal?.label} style={{ color: medal?.color }}>{medal ? medal.icon : ''}</span>
                              ) : null}
                              <Tooltip id={`medal-${entry.id}`} className="rounded-md" style={{ backgroundColor: "rgb(27, 21, 49)", color: medal?.color, fontSize: "1rem", padding: "0.25rem 0.5rem" }} />
                              <Tooltip id={`posMedal-${entry.id}`} className="rounded-md" style={{ backgroundColor: "rgb(27, 21, 49)", color: posMedal?.color, fontSize: "1rem", padding: "0.25rem 0.5rem" }} />
                            </div>
                            <div><span className="font-semibold text-gray-300 truncate">Name:</span> <span className={userTextStyle + ' truncate'}>{entry.name}</span></div>
                            <div><span className="font-semibold text-gray-300">User ID:</span> <span className={userTextStyle}>{entry.userId}</span></div>
                            <div><span className="font-semibold text-gray-300">Car Colors:</span> {displayCarColors(entry.carColors)}</div>
                            <div><span className="font-semibold text-gray-300">Frames:</span> <span className={userTextStyle}>{entry.frames}</span> (<span className={userTextStyle}>{formatTime(entry.frames)}</span>)</div>
                            <div className="flex items-center gap-1"><span className="font-semibold text-gray-300">Verified:</span><VerifiedStateIcon verifiedState={entry.verifiedState} /></div>
                            <div className="overflow-x-auto no-scroll"><span className="font-semibold text-gray-300">Recording:</span>{recordingData && recordingData[index] ? displayRecording(recordingData[index]?.recording || null) : displayRecording(null)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={currentPage === 1 || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50">
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 ||loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-gray-300">Page {currentPage} of {totalPagesRef.current}</span>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPagesRef.current || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(Math.min(currentPage + 10, totalPagesRef.current))} disabled={currentPage + 10 >= totalPagesRef.current || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50">
                      +{10}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handlePageChange(totalPagesRef.current)} disabled={currentPage === totalPagesRef.current || loading} className="bg-gray-800/50 text-white hover:bg-gray-700/50">
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                    {userPage && (
                      <Button variant="outline" onClick={() => handlePageChange(userPage)} disabled={loading} className="bg-purple-900/50 text-white hover:bg-purple-800/50">
                        Go to Your Page ({userPage})
                      </Button>
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Go to pos."
                        value={goToPosition}
                        onChange={(e) => setGoToPosition(e.target.value)}
                        className="w-24 bg-gray-800/50 text-white border-gray-700 placeholder:text-gray-500"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleGoToPage(); }}
                      />
                      <Button onClick={handleGoToPage} disabled={loading} className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30">
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
