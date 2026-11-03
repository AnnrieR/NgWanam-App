export type HoursRange = {
  startLabel: string;
  endLabel: string;
  startMin: number;
  endMin: number;
};

function normalizeLabel(label: string) {
  return label.trim().replace(/\s*([ap])\s*m/i, (_, letter: string) => ` ${letter.toUpperCase()}M`);
}

function toMinutes(label: string): number | null {
  const match = label.match(/(\d{1,2}):(\d{2})\s*([ap])/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toLowerCase() === "p") hour += 12;
  return hour * 60 + Number(match[2]);
}

export function parseHoursRange(hours?: string | null): HoursRange | null {
  if (!hours) return null;
  const match = hours.match(/(\d{1,2}:\d{2}\s*[ap]\s*m)\s*[-–—]\s*(\d{1,2}:\d{2}\s*[ap]\s*m)/i);
  if (!match) return null;
  const startMin = toMinutes(match[1]);
  const endMin = toMinutes(match[2]);
  if (startMin == null || endMin == null) return null;
  return { startLabel: normalizeLabel(match[1]), endLabel: normalizeLabel(match[2]), startMin, endMin };
}

export function getOpenStatus(hours?: string | null): { open: boolean; text: string } | null {
  const range = parseHoursRange(hours);
  if (!range) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const open = nowMin >= range.startMin && nowMin < range.endMin;
  return open
    ? { open, text: `We are currently OPEN (until ${range.endLabel} Today)` }
    : { open, text: `We are currently CLOSED (Opens ${range.startLabel})` };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getWeeklyHours(hours?: string | null): { day: string; value: string }[] | null {
  const range = parseHoursRange(hours);
  if (!range) return null;
  const value = `${range.startLabel} - ${range.endLabel}`;
  return WEEKDAYS.map((day) => ({ day, value }));
}
