// Counts consecutive days (up to today) where user had >=1 completion.
function computeStreak(datesWithActivitySet, todayYMD) {
  let streak = 0;
  const d = new Date(todayYMD);
  while (true) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const ymd = `${y}-${m}-${da}`;
    if (datesWithActivitySet.has(ymd)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

module.exports = { computeStreak };
