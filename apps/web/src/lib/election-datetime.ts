export function parseDateTimeInTimezone(value: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
  ].map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const parsedDate = new Date(localAsUtc);

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
      timeZone: timezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    let utcGuess = localAsUtc;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const parts = Object.fromEntries(
        formatter
          .formatToParts(new Date(utcGuess))
          .map(({ type, value }) => [type, value]),
      );
      const formattedAsUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
      );
      const nextGuess = utcGuess + localAsUtc - formattedAsUtc;
      if (nextGuess === utcGuess) break;
      utcGuess = nextGuess;
    }

    const resolved = new Date(utcGuess);
    const result = Object.fromEntries(
      formatter
        .formatToParts(resolved)
        .map(({ type, value }) => [type, value]),
    );

    if (
      Number(result.year) !== year ||
      Number(result.month) !== month ||
      Number(result.day) !== day ||
      Number(result.hour) !== hour ||
      Number(result.minute) !== minute
    ) {
      return null;
    }

    return resolved;
  } catch {
    return null;
  }
}
