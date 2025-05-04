import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { Search, BarChart2, FileText, Users, Settings, ChevronDown } from 'lucide-react'; // Icons for features and new buttons
// Import useNavigate from react-router-dom
import { useNavigate } from 'react-router-dom';
import { useState } from 'react'; // Import useState for the tutorial state

// Define simple animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10
    }
  }
};

const Home = () => {
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false); // State to control tutorial visibility

  const handleNavigateToLeaderboards = () => {
    navigate('/leaderboard');
  };

  const handleNavigateToUser = () => {
    navigate('/user');
  };

  const handleNavigateToUtils = () => {
    navigate('/utils');
  };

  const toggleTutorial = () => {
    setShowTutorial(!showTutorial);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white flex flex-col items-center justify-center p-4 md:p-8">
      <motion.div
        className="max-w-4xl mx-auto text-center space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 drop-shadow-lg"
          variants={itemVariants}
        >
          Welcome to Polystats
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-gray-300 leading-relaxed"
          variants={itemVariants}
        >
          Polystats provides a comprehensive platform for analyzing <a href="https://www.kodub.com/apps/polytrack" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Polytrack</a> data and user statistics.
        </motion.p>

        {/* How to Use Section */}
        <motion.div
          className="bg-black/20 border border-blue-500/30 rounded-lg p-6 space-y-4 shadow-md text-left"
          variants={itemVariants}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-blue-400">
              <FileText size={24} />
              <h3 className="text-xl font-semibold">How to Use Polystats</h3>
            </div>
            <motion.button
              onClick={toggleTutorial}
              className="flex items-center justify-center text-blue-300 hover:text-blue-400"
              whileTap={{ scale: 0.9 }}
              aria-label={showTutorial ? 'Hide tutorial' : 'Show tutorial'}
            >
              <motion.div
                animate={{
                  rotate: showTutorial ? 180 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
              >
                <ChevronDown size={24} />
              </motion.div>
            </motion.button>
          </div>
          <AnimatePresence>
            {showTutorial && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="mt-4 space-y-2 text-gray-400 text-sm"
              >
                <p>Polystats primarily accepts two types of inputs: <strong>UserID</strong> and <strong>User Token</strong> (also known as User Key)</p>
                <p><strong>Getting your User ID:</strong></p>
                <ul className="list-disc list-inside">
                  <li>To obtain your UserID, go to the "Utils" page on Polystats.</li>
                  <li>On the "Utils" page, you can retrieve your UserID either from your User Token or from a Rank on a specific Track.</li>
                </ul>
                <p><strong>Getting your User Token:</strong></p>
                <ul className="list-disc list-inside">
                  <li>Your User Token can be found on the Polytrack website.</li>
                  <li>Go to your "Profile," select a profile, and click "Export."</li>
                  <li>A disclaimer will appear. Please note that Polystats does not save or share any user data.</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          {!showTutorial && (
            <div className="mt-4 text-gray-400 text-sm overflow-hidden max-h-8 transition-max-h duration-300" style={{ maxHeight: showTutorial ? 'none' : '2rem' }}>
              <p>Polystats primarily accepts two types of inputs: UserID and User Token (also known as User Key).  To obtain your UserID, go to the "Utils" page on Polystats...</p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-8"
          variants={containerVariants} // Stagger children within this grid
        >
          {/* Leaderboard Box with Button */}
          <motion.div className="bg-black/20 border border-purple-500/30 rounded-lg p-6 space-y-4 shadow-lg flex flex-col justify-between items-center text-center" variants={itemVariants}>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-purple-400">
                <BarChart2 size={24} />
                <h3 className="text-xl font-semibold">Leaderboards</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Explore global rankings and track records.
              </p>
            </div>
            <Button
              onClick={handleNavigateToLeaderboards}
              className="mt-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 text-md rounded-full transition-all duration-300 hover:from-purple-600 hover:to-blue-600 hover:scale-105 shadow-lg focus:outline-none focus:ring-0 flex items-center justify-center gap-2"
            >
              <BarChart2 size={20} />
              View Leaderboards
            </Button>
          </motion.div>

          {/* User Stats Box with Button */}
          <motion.div className="bg-black/20 border border-purple-500/30 rounded-lg p-6 space-y-4 shadow-lg flex flex-col justify-between items-center text-center" variants={itemVariants}>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-purple-400">
                <Users size={24} />
                <h3 className="text-xl font-semibold">User Stats</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Access detailed statistics for personal bests and averages.
              </p>
            </div>
            <Button
              onClick={handleNavigateToUser}
              className="mt-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 text-md rounded-full transition-all duration-300 hover:from-blue-600 hover:to-cyan-600 hover:scale-105 shadow-lg focus:outline-none focus:ring-0 flex items-center justify-center gap-2"
            >
              <Users size={20} />
              View User Stats
            </Button>
          </motion.div>

          {/* Utilities Box with Button */}
          <motion.div className="bg-black/20 border border-purple-500/30 rounded-lg p-6 space-y-4 shadow-lg flex flex-col justify-between items-center text-center" variants={itemVariants}>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-purple-400">
                <Settings size={24} />
                <h3 className="text-xl font-semibold">Utilities</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Access helpful tools like User ID fetcher.
              </p>
            </div>
            <Button
              onClick={handleNavigateToUtils}
              className="mt-4 bg-gradient-to-r from-cyan-500 to-green-500 text-white px-6 py-3 text-md rounded-full transition-all duration-300 hover:from-cyan-600 hover:to-green-600 hover:scale-105 shadow-lg focus:outline-none focus:ring-0 flex items-center justify-center gap-2"
            >
              <Settings size={20} />
              Access Utilities
            </Button>
          </motion.div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Home;
