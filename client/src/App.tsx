import { useState } from 'react';
import Analytics from './components/Analytics';
import Portfolio from './components/Portfolio';
import Leaderboard from './components/Leaderboard';
import TransactionHistory from './components/TransactionHistory';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

type Section = 'overview' | 'analytics' | 'portfolio' | 'leaderboard' | 'history';

function App() {
  const [activeSection, setActiveSection] = useState<Section>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isConnected } = useWebSocket();

  const navItems = [
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'portfolio', label: 'Portfolio', icon: '💼' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
    { id: 'history', label: 'History', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-black/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 z-50 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="p-6">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-purple-500 bg-clip-text text-transparent">
              STRAT
            </h1>
            <div className="text-xs text-gray-400 mt-1">Blockchain Dashboard</div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as Section)}
                className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                  activeSection === item.id
                    ? 'bg-gradient-to-r from-green-400/20 to-purple-500/20 border-l-4 border-green-400 font-bold'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* WebSocket Status */}
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-2 rounded-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span>{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10">
          <div className="px-8 py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Welcome back, <span className="text-white font-bold">User</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-purple-500 flex items-center justify-center font-bold">
                U
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-4xl font-bold mb-2">
                {navItems.find((item) => item.id === activeSection)?.label}
              </h2>
              <p className="text-gray-400">
                Real-time blockchain data with automatic updates
              </p>
            </div>

            {activeSection === 'analytics' && <Analytics />}
            {activeSection === 'portfolio' && <Portfolio />}
            {activeSection === 'leaderboard' && <Leaderboard />}
            {activeSection === 'history' && <TransactionHistory />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
