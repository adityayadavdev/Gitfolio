import React from 'react';

const PDFPortfolioTemplate = ({ template = 'minimal', profile, languageScores = [], topProjects = [], metrics = {} }) => {
  const isMinimal = template === 'minimal';

  return (
    <div className={`mx-auto ${isMinimal ? 'bg-white text-[#1a1a1a]' : 'bg-gray-100 text-gray-800'} font-sans`} style={{ width: '794px', minHeight: '1123px', padding: '40px' }}>
      {/* Header */}
      <header className={`mb-8 ${!isMinimal && 'flex gap-4 pl-4 border-l-8 border-blue-600'}`}>
        <div>
          <h1 className="text-4xl font-bold mb-1">{profile?.name || 'Developer Name'}</h1>
          <p className="text-lg text-gray-500 mb-2">{profile?.bio || 'Software Engineer'}</p>
          <div className="flex gap-4 text-sm text-gray-600">
            <span>{profile?.location || 'Location'}</span>
            <span>{profile?.githubUrl || 'github.com/username'}</span>
          </div>
        </div>
      </header>

      {isMinimal ? (
        <div className="space-y-8">
          {/* Minimal Skills */}
          <section>
            <h2 className="text-xl font-bold border-b-2 border-gray-200 mb-4 pb-1">Technical Skills</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {languageScores.map((lang, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <span className="font-medium">{lang.language}</span>
                  <span className="text-sm text-gray-500">{lang.depthLabel || 'Proficient'}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Minimal Projects */}
          <section>
            <h2 className="text-xl font-bold border-b-2 border-gray-200 mb-4 pb-1">Top Projects</h2>
            <div className="space-y-6">
              {topProjects.slice(0, 3).map((project, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-lg font-bold">{project.name}</h3>
                    <a href={project.url} className="text-sm text-blue-600 underline">{project.url}</a>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{project.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {project.languages?.map((l, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{l}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Visual Contribution Summary */}
          <section className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalContributions || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Contributions</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.longestStreak || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Longest Streak</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.activeDays || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Active Days</div>
            </div>
          </section>

          {/* Visual Language Depth */}
          <section className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold mb-6">Language Proficiency</h2>
            <div className="space-y-4">
              {languageScores.map((lang, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{lang.language}</span>
                    <span className="text-gray-500">{lang.depthLabel}</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${lang.normalizedScore || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Visual Projects Grid */}
          <section>
            <h2 className="text-xl font-bold mb-4">Featured Projects</h2>
            <div className="grid grid-cols-2 gap-6">
              {topProjects.slice(0, 4).map((project, index) => (
                <div key={index} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-2">{project.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                  </div>
                  <div className="mt-auto">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.languages?.map((l, i) => (
                        <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{l}</span>
                      ))}
                    </div>
                    <a href={project.url} className="text-xs text-blue-600 font-semibold hover:underline">View Project →</a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto pt-12 text-center text-xs text-gray-400">
        Generated by Gitfolio.in
      </footer>
    </div>
  );
};

export default PDFPortfolioTemplate;
