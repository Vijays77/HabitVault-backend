function toYMD(d = new Date()) {
  const offsetMs = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
  return local; // YYYY-MM-DD
}

function lastNDays(n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(toYMD(d));
  }
  return out;
}

function weekdayShort(ymd) {
  const parts = ymd.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
}

module.exports = { toYMD, lastNDays, weekdayShort };
