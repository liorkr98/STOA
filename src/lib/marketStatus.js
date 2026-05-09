function isDaylightSavingTime(date) {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  return date.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

export function getMarketStatus() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const offset = isDaylightSavingTime(now) ? 4 : 5;
  const nyHour = ((utcHour - offset) + 24) % 24;
  const nyMinute = utcMinute;
  const day = now.getUTCDay(); // 0=Sun, 6=Sat

  if (day === 0 || day === 6) {
    return { status: 'closed', label: '○ Market Closed', color: '#6b7280', tooltip: 'Last closing price' };
  }

  const timeInMinutes = nyHour * 60 + nyMinute;
  const preMarketStart = 4 * 60;    // 4:00 AM
  const regularOpen   = 9 * 60 + 30; // 9:30 AM
  const regularClose  = 16 * 60;     // 4:00 PM
  const afterHoursEnd = 20 * 60;     // 8:00 PM

  if (timeInMinutes >= regularOpen && timeInMinutes < regularClose) {
    return { status: 'open', label: '● Market Open', color: '#16a34a', tooltip: 'Real-time price' };
  } else if (timeInMinutes >= preMarketStart && timeInMinutes < regularOpen) {
    return { status: 'premarket', label: '◑ Pre-Market', color: '#d97706', tooltip: 'Extended hours price — lower liquidity, higher volatility' };
  } else if (timeInMinutes >= regularClose && timeInMinutes < afterHoursEnd) {
    return { status: 'afterhours', label: '◑ After-Hours', color: '#d97706', tooltip: 'Extended hours price — lower liquidity, higher volatility' };
  } else {
    return { status: 'closed', label: '○ Market Closed', color: '#6b7280', tooltip: 'Last closing price' };
  }
}

export function isExtendedHours() {
  const s = getMarketStatus();
  return s.status === 'premarket' || s.status === 'afterhours' || s.status === 'closed';
}