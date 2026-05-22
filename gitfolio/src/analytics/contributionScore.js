export function computeContributionMetrics(contributionCalendar) {
  const { weeks } = contributionCalendar;
  const allDays = weeks.flatMap(week => week.contributionDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let activeDays = 0;
  let weekdayContribs = 0;
  let weekendContribs = 0;
  const monthTotals = new Array(12).fill(0);
  const weeklyTotals = weeks.map(week => 
    week.contributionDays.reduce((sum, day) => sum + day.count, 0)
  );

  let placementSeasonContribs = 0;
  let otherSeasonContribs = 0;
  let recentContribs = 0;
  let oldContribs = 0;

  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(today.getDate() - 90);
  const oneEightyDaysAgo = new Date(today);
  oneEightyDaysAgo.setDate(today.getDate() - 180);

  const sortedDays = [...allDays].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 0; i < sortedDays.length; i++) {
    const { date, count } = sortedDays[i];
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    if (count > 0) {
      tempStreak++;
      
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendContribs += count;
      } else {
        weekdayContribs += count;
      }

      const month = d.getMonth();
      monthTotals[month] += count;

      if (month >= 7 && month <= 10) { // Aug (7) to Nov (10)
        placementSeasonContribs += count;
      } else {
        otherSeasonContribs += count;
      }

      if (d >= ninetyDaysAgo && d <= today) {
        recentContribs += count;
      } else if (d >= oneEightyDaysAgo && d < ninetyDaysAgo) {
        oldContribs += count;
      }

      const diffTime = Math.abs(today - d);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 365) {
        activeDays++;
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Current streak: go backwards from today
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const { date, count } = sortedDays[i];
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    if (count > 0 && (today - d) / (1000 * 60 * 60 * 24) <= 1) {
      currentStreak++;
      today.setDate(today.getDate() - 1);
    } else if (count === 0 && (today - d) / (1000 * 60 * 60 * 24) <= 1) {
      break;
    } else if ((today - d) / (1000 * 60 * 60 * 24) > 1) {
      break;
    }
  }

  const peakMonthIndex = monthTotals.indexOf(Math.max(...monthTotals));
  const peakMonth = new Date(2000, peakMonthIndex).toLocaleString('default', { month: 'long' });

  // Consistency Score
  const avgWeekly = weeklyTotals.reduce((a, b) => a + b, 0) / weeklyTotals.length;
  const variance = weeklyTotals.reduce((a, b) => a + Math.pow(b - avgWeekly, 2), 0) / weeklyTotals.length;
  const stdDev = Math.sqrt(variance);
  const consistencyScore = avgWeekly === 0 ? 0 : Math.max(0, Math.min(100, 100 - (stdDev / avgWeekly * 100)));

  return {
    currentStreak,
    longestStreak,
    activeDays,
    activePercentage: activeDays / 365,
    weekdayVsWeekend: weekendContribs === 0 ? weekdayContribs : weekdayContribs / weekendContribs,
    peakMonth,
    consistencyScore,
    placementSeasonActivity: placementSeasonContribs / (otherSeasonContribs || 1),
    recentVsOld: oldContribs === 0 ? recentContribs : recentContribs / oldContribs
  };
}



// Tests
const sampleCalendar = {
  totalContributions: 100,
  weeks: [
    {
      contributionDays: [
        { date: '2026-05-17', count: 5 },
        { date: '2026-05-18', count: 2 },
        { date: '2026-05-16', count: 1 },
        { date: '2026-05-15', count: 0 },
        { date: '2026-05-14', count: 3 },
        { date: '2026-05-13', count: 4 },
        { date: '2026-05-12', count: 1 },
      ]
    },
    {
      contributionDays: [
        { date: '2026-05-05', count: 1 },
        { date: '2026-05-06', count: 0 },
        { date: '2026-05-07', count: 0 },
        { date: '2026-05-08', count: 0 },
        { date: '2026-05-09', count: 0 },
        { date: '2026-05-10', count: 0 },
        { date: '2026-05-11', count: 0 },
      ]
    }
  ]
};

const metrics = computeContributionMetrics(sampleCalendar);
console.assert(metrics.currentStreak >= 0, 'Current streak should be non-negative');
console.assert(metrics.longestStreak >= 0, 'Longest streak should be non-negative');
console.assert(metrics.activePercentage >= 0 && metrics.activePercentage <= 1, 'Active percentage should be between 0 and 1');
