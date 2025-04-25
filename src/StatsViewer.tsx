import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Search, Trophy, User, Timer, Circle, CheckCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, File, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";

interface LeaderboardEntry { id: number; userId: string; name: string; carColors: string; frames: number; verifiedState: number; position: number; rank?: number; }
interface LeaderboardData { total: number; entries: LeaderboardEntry[]; userEntry: LeaderboardEntry | null; }
interface RecordingData { recording: string; frames: number; verifiedState: number; carColors: string; }

const API_BASE_URL = "https://vps.kodub.com:43273/leaderboard";
const RECORDING_API_BASE_URL = "https://vps.kodub.com:43273/recordings";
const PROXY_URL = "https://hi-rewis.maxicode.workers.dev/?url=";
const VERSION = "0.5.0";
const AMOUNT = 10;

const CopyPopup = ({ text }: { text: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm px-4 py-2 rounded-md shadow-lg z-50"
    >
      Copied: {text}
    </motion.div>
  );
};

const StatsViewer = () => {
  const [userId, setUserId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [statsData, setStatsData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userPage, setUserPage] = useState<number | null>(null);
  const [goToPosition, setGoToPosition] = useState("");
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
    let timeString = "";
    if (h > 0) timeString += `${h}h `;
    if (m > 0 || h > 0) timeString += `${m}m `;
    timeString += `${s}.${ms.toString().padStart(3, "0")}s`;
    return timeString;
  };

  const fetchStats = useCallback(async (page: number = 1) => {
    if (!userId) { setError("Please enter a User ID."); return; }
    if (!trackId) { setError("Please enter a Track ID."); return; }
    setLoading(true); setError(null); setStatsData(null); setCurrentPage(page); setUserData(null); setRecordingData(null);
    try {
      const skip = (page - 1) * AMOUNT;
      const leaderboardUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=${skip}&amount=${AMOUNT}&onlyVerified=${onlyVerified}&userTokenHash=${userId}`)}`;
      const data: LeaderboardData = await (await fetch(leaderboardUrl)).json();
      totalPagesRef.current = Math.ceil(data.total / AMOUNT);
      let userEntry = data.userEntry;

      if (userEntry) {
        const userSkip = Math.max(0, Math.floor((userEntry.position - 10 - 1) / AMOUNT) * AMOUNT);
        const userAmount = 20;
        const userUrl = `${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=${userSkip}&amount=${userAmount}&onlyVerified=${onlyVerified}&userTokenHash=${userId}`)}`;
        const uData: LeaderboardData = await (await fetch(userUrl)).json();
        const foundUser = uData.entries.find((e) => e.userId === userId);
        if (foundUser) setUserData({ ...foundUser, rank: uData.userEntry?.position || 0 });
        setUserPage(Math.ceil(userEntry.position / AMOUNT));
      }

      data.entries = await Promise.all(
        data.entries.map(async (entry) => {
          const response = await fetch(`${PROXY_URL}${encodeURIComponent(API_BASE_URL + `?version=${VERSION}&trackId=${trackId}&skip=0&amount=1&onlyVerified=${onlyVerified}&userTokenHash=${entry.userId}`)}`);
          const result = await response.json();
          return {
            ...entry,
            rank: result.userEntry?.position || 0,
          }
        })
      );

      if (data.entries.length > 0) {
        const recordingIds = data.entries.map((entry) => entry.id).join(",");
        const recordingUrl = `${PROXY_URL}${encodeURIComponent(RECORDING_API_BASE_URL + `?version=${VERSION}&recordingIds=${recordingIds}`)}`;
        const recordingResponse = await fetch(recordingUrl);
        setRecordingData(recordingResponse.ok ? await recordingResponse.json() : Array(data.entries.length).fill(null));
      } else {
        setRecordingData([]);
      }
      setStatsData(data);
    } catch (error: any) {
      setError(error.message);
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
      setGoToPosition("");
    }
    else setError("Invalid position.");
  };

  const copyToClipboard = (text: string) => {
    if (!navigator.clipboard) { console.warn("Clipboard API is not available in this context."); return; }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedText(text);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopiedText(null), 2000);
      })
      .catch((err) => { console.error("Failed to copy: ", err); });
  };

  const displayCarColors = (carColors: string) => {
    if (!carColors) return "No Color Data";
    const colors = carColors.match(/.{1,6}/g);
    if (!colors) return "Invalid Color Data";
    return (
      <div className="flex gap-2 items-center">
        {colors.map((c, i) => {
          const hex = `#${c.padEnd(6, "0")}`;
          return (
            <motion.div 
              key={i} 
              style={{ backgroundColor: hex, cursor: "pointer" }} 
              className="w-4 h-4 rounded" 
              title={hex} 
              onClick={() => copyToClipboard(hex)} 
              whileHover={{ scale: 1.2 }} 
              transition={{ type: "spring", stiffness: 400, damping: 10 }} 
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

  const displayRecording = (rec: string | null) =>
    rec ? (
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4 md:p-8">
      {copiedText && <CopyPopup text={copiedText} />}
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          Polystats
        </h1>
        {/* ... rest of your component remains the same ... */}
      </div>
    </div>
  );
};

export default StatsViewer;
