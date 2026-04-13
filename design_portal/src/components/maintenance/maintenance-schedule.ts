export type MaintenanceMode = 'none' | 'banner' | 'fullPage';

const IST_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  hour: '2-digit',
  hour12: false,
});

/**
 * Returns maintenance UI mode for Wed/Fri IST windows:
 * - banner: 1:00 PM – 6:59 PM IST
 * - fullPage: 7:00 PM – 7:59 PM IST
 * - none: all other times
 */
export function getMaintenanceMode(now: Date = new Date()): MaintenanceMode {
  const parts = IST_FORMATTER.formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value;
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);

  const isTargetDay = weekday === 'Wed' || weekday === 'Fri';
  if (!isTargetDay) {
    return 'none';
  }

  if (process.env.NEXT_PUBLIC_MAINTENANCE === 'true') {
    // if (hour >= 19 && hour < 20) {
    //   return 'fullPage';
    // }
    if (hour >= 13 && hour < 19) {
      return 'banner';
    }
  }

  return 'none';
}
