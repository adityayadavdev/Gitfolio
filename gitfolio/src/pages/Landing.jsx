import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Filter, BarChart, Share2, Copy, X, Loader2, GitBranch, Check } from 'lucide-react';

const Landing = () => {
  const { startAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [authData, setAuthData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [primaryCopied, setPrimaryCopied] = useState(false);
  const [secondaryCopied, setSecondaryCopied] = useState(false);
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

  const handleOpenVerify = async () => {
    window.open(authData.verification_uri, '_blank');
    await navigator.clipboard.writeText(authData.user_code);
    setPrimaryCopied(true);
    setTimeout(() => setPrimaryCopied(false), 3000);
  };

  const handleCopyLink = async () => {
    if (!authData) return;
    await navigator.clipboard.writeText(authData.verification_uri);
    setSecondaryCopied(true);
    setTimeout(() => setSecondaryCopied(false), 2000);
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
          <div 
            className="bg-white rounded-3xl shadow-2xl relative animate-in fade-in zoom-in duration-200" 
            style={{ maxWidth: '420px', width: '100%', padding: '32px 28px' }}
          >
            <button 
              onClick={handleCloseModal}
              className="absolute top-6 right-6 p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent', color: '#656d76' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f6f8fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold mb-6 text-[#1a1a2e]">Connect GitHub</h2>

              <div 
                className="rounded-lg border mb-4" 
                style={{ backgroundColor: '#f6f8fa', borderColor: '#d0d7de', padding: '20px', marginBottom: '16px' }}
              >
                <p 
                  className="mb-2 uppercase" 
                  style={{ fontSize: '11px', color: '#656d76', letterSpacing: '0.08em', fontWeight: '600' }}
                >
                  Your User Code
                </p>
                <div 
                  className="font-mono select-all" 
                  style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a2e', letterSpacing: '0.15em' }}
                >
                  {authData.user_code}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mb-6">
                <button 
                  onClick={handleOpenVerify}
                  className="flex items-center justify-center gap-2 transition-all"
                  style={{ 
                    backgroundColor: primaryCopied ? '#1a7f37' : '#238636', 
                    color: '#ffffff', 
                    borderRadius: '8px', 
                    padding: '12px 20px',
                    fontWeight: '600',
                    fontSize: '15px'
                  }}
                  onMouseEnter={(e) => !primaryCopied && (e.currentTarget.style.backgroundColor = '#2ea043')}
                  onMouseLeave={(e) => !primaryCopied && (e.currentTarget.style.backgroundColor = '#238636')}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.99)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {!primaryCopied && <GitBranch size={18} />}
                  {primaryCopied ? 'Code copied — paste it on GitHub ✓' : 'Open GitHub to verify'}
                </button>

                <button 
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 transition-all"
                  style={{ 
                    backgroundColor: '#ffffff', 
                    color: '#24292f', 
                    border: '1px solid #d0d7de', 
                    borderRadius: '8px', 
                    padding: '11px 20px',
                    fontWeight: '500',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f6f8fa';
                    e.currentTarget.style.borderColor = '#8c959f';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.borderColor = '#d0d7de';
                  }}
                >
                  {secondaryCopied ? (
                    <>
                      <Check size={15} style={{ color: '#238636' }} />
                      <span>Link copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} style={{ color: '#656d76' }} />
                      <span>Copy verification link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 mb-4" style={{ color: '#656d76' }}>
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="text-sm font-medium">Waiting for authorization...</span>
              </div>
              
              <p 
                className="text-xs" 
                style={{ color: timeLeft < 120 ? '#cf222e' : '#8c959f' }}
              >
                Code expires in <span className="font-semibold">{formatTime(timeLeft)}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
