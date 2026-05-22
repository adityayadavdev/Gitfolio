import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Filter, BarChart, Share2, Copy, X, Loader2 } from 'lucide-react';

const Landing = () => {
  const { startAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [authData, setAuthData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let timer;
    if (authData && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authData, timeLeft]);

  const handleConnect = async () => {
    try {
      abortControllerRef.current = new AbortController();
      const data = await startAuth(abortControllerRef.current.signal);
      setAuthData(data);
      setTimeLeft(data.expires_in);
    } catch (error) {
      console.error('Failed to start auth:', error);
    }
  };

  const handleCloseModal = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setAuthData(null);
    setTimeLeft(0);
  };

  const copyLink = async () => {
    if (!authData) return;
    await navigator.clipboard.writeText(authData.verification_uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen text-white font-sans" style={{ backgroundColor: '#0d1117' }}>
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
          Turn your GitHub into a <span className="text-blue-600">placement portfolio</span>
        </h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Analytics, quality scores, and a shareable portfolio page — built for Indian developers.
        </p>
        <button 
          onClick={handleConnect}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-105 shadow-lg"
        >
          Connect GitHub
        </button>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-[#161b22] rounded-2xl shadow-sm border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6">
              <Filter size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Smart filtering</h3>
            <p className="text-slate-400">Automatically removes forks and assignments to showcase your original work.</p>
          </div>
          <div className="p-8 bg-[#161b22] rounded-2xl shadow-sm border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-6">
              <BarChart size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Depth scores</h3>
            <p className="text-slate-400">Go beyond language bars. Get a real depth score based on commit quality and complexity.</p>
          </div>
          <div className="p-8 bg-[#161b22] rounded-2xl shadow-sm border border-[#30363d] flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-6">
              <Share2 size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Shareable portfolio</h3>
            <p className="text-slate-400">One clean, professional link to send to recruiters and hiring managers.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 text-center text-slate-500 text-sm">
        Free to use. No email required. No data stored on our servers.
      </footer>

      {/* Auth Modal */}
      {authData && (
        <div id="auth-modal" role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={handleCloseModal}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 size={32} className="animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Connect GitHub</h2>
              <p className="text-slate-600 mb-8">Authorize Gitfolio to analyze your repositories</p>

              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                <p className="text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">Your User Code</p>
                <div className="text-3xl font-mono font-bold text-slate-900 mb-6 tracking-widest">
                  {authData.user_code}
                </div>
                <button 
                  onClick={copyLink}
                  className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 px-4 py-3 rounded-xl font-medium transition-all shadow-sm"
                >
                  {copied ? 'Copied!' : (
                    <>
                      <Copy size={18} />
                      Copy Verification Link
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-3 text-slate-500 mb-4">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-medium">Waiting for authorization...</span>
              </div>
              <p className="text-xs text-slate-400">
                Code expires in <span className="font-semibold text-slate-600">{formatTime(timeLeft)}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
