import { useState } from 'react';
import PremiumGate from './PremiumGate';
import LockedFeature from './LockedFeature';
import { useAuth } from '../hooks/useAuth';
import { useGitHubData } from '../hooks/useGitHubData';
import { Button } from './ui/Button';
import { Download, Mail, Phone, Link2, GraduationCap, BookOpen } from 'lucide-react';

const PlacementCard = () => {
  const { user, token } = useAuth();
  const { profile, languages, repos } = useGitHubData({ username: user?.login, token });

  const [editableFields, setEditableFields] = useState({
    cgpa: '',
    branch: '',
    gradYear: '',
    email: '',
    phone: '',
    linkedin: '',
  });

  const handleFieldChange = (field, value) => {
    setEditableFields(prev => ({ ...prev, [field]: value }));
  };

  const calculateTopSkills = () => {
    const skillMap = {};
    Object.values(languages).forEach(langData => {
      if (!langData) return;
      Object.entries(langData).forEach(([lang, bytes]) => {
        skillMap[lang] = (skillMap[lang] || 0) + bytes;
      });
    });

    return Object.entries(skillMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([lang], index) => {
        const labels = ['Expert', 'Advanced', 'Intermediate'];
        return { lang, label: labels[index] || 'Proficient' };
      });
  };

  const calculateTopProjects = () => {
    return [...(repos || [])]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 2)
      .map(repo => repo.name);
  };

  const topSkills = calculateTopSkills();
  const topProjects = calculateTopProjects();
  const portfolioUrl = `https://gitfolio.ai/u/${user?.login}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(portfolioUrl)}`;

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-slate-50 min-h-screen">
      <PremiumGate 
        fallback={<LockedFeature featureName="Placement Card Generator" />}
      >
        <div className="flex justify-between items-center w-[210mm] mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Placement Card</h2>
            <p className="text-slate-500 text-sm">Customize your business card and download as PDF</p>
          </div>
          <Button 
            onClick={handleDownloadPDF} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
        <div className="relative w-[210mm] h-[148mm] bg-white text-slate-900 p-8 mx-auto shadow-2xl border border-slate-200 rounded-sm overflow-hidden" id="placement-card">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 -z-10 skew-x-12 translate-x-20" />
          
          <div className="flex h-full gap-8">
            {/* Left Section: Profile & Info */}
            <div className="flex-1 flex flex-col">
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-slate-800 mb-1">{profile?.name || user?.login}</h1>
                <p className="text-lg text-slate-500 font-medium">Software Engineer & Open Source Contributor</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-slate-700">
                  <GraduationCap className="w-5 h-5 text-slate-400" />
                  <input 
                    className="border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent w-full"
                    placeholder="Branch (e.g. Computer Science)"
                    value={editableFields.branch}
                    onChange={(e) => handleFieldChange('branch', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <div className="flex gap-4 w-full">
                    <input 
                      className="border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent w-1/2"
                      placeholder="CGPA"
                      value={editableFields.cgpa}
                      onChange={(e) => handleFieldChange('cgpa', e.target.value)}
                    />
                    <input 
                      className="border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent w-1/2"
                      placeholder="Grad Year"
                      value={editableFields.gradYear}
                      onChange={(e) => handleFieldChange('gradYear', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <input 
                    className="border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent w-full"
                    placeholder="Email Address"
                    value={editableFields.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <input 
                    className="border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent w-full"
                    placeholder="Phone Number"
                    value={editableFields.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <Link2 className="w-5 h-5 text-slate-400" />
                  <input 
                    className="border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors bg-transparent w-full"
                    placeholder="LinkedIn Profile URL"
                    value={editableFields.linkedin}
                    onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-auto">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Top Projects</h3>
                <div className="flex gap-2">
                  {topProjects.length > 0 ? (
                    topProjects.map(proj => (
                      <span key={proj} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
                        {proj}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No projects available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Section: Skills & QR */}
            <div className="w-64 flex flex-col items-center justify-between border-l border-slate-100 pl-8">
              <div className="w-full">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 text-center">Core Expertise</h3>
                <div className="space-y-3">
                  {topSkills.length > 0 ? (
                    topSkills.map((skill, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <span className="text-lg font-bold text-slate-800">{skill.lang}</span>
                        <span className="text-[10px] font-semibold text-blue-600 uppercase">{skill.label}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center">Fetching skills...</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 mt-8">
                <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <img src={qrCodeUrl} alt="Portfolio QR Code" className="w-32 h-32" />
                </div>
                <p className="text-[10px] text-slate-400 font-medium text-center">Scan to view full<br/>GitHub Portfolio</p>
              </div>
            </div>
          </div>

          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #placement-card, #placement-card * {
                visibility: visible;
              }
              #placement-card {
                position: absolute;
                left: 0;
                top: 0;
                margin: 0;
                padding: 0;
                box-shadow: none;
                border: none;
                width: 210mm;
                height: 148mm;
              }
              @page {
                size: A5 landscape;
                margin: 0;
              }
            }
          `}</style>
        </div>
      </PremiumGate>
    </div>
  );
};

export default PlacementCard;
