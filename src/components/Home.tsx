import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { Search, BarChart2, FileText, Users, Settings } from 'lucide-react'; // Icons for features and new buttons
// Import useNavigate from react-router-dom
import { useNavigate } from 'react-router-dom';

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
  // Use the useNavigate hook to get the navigate function
  const navigate = useNavigate();

  // Navigation handlers using the navigate function
  const handleNavigateToLeaderboards = () => {
    navigate('/polystats/leaderboard');
  };

  const handleNavigateToUser = () => {
    navigate('/polystats/user');
  };

  const handleNavigateToUtils = () => {
    navigate('/polystats/utils');
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

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
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