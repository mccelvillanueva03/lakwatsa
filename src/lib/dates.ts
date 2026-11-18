import { Temporal } from '@js-temporal/polyfill';
import { UserError } from './validation';
export function localToUtc(local: string, timezone: string, offset?: string) {
  try {
    const plain = Temporal.PlainDateTime.from(local);
    const zoned = offset
      ? Temporal.ZonedDateTime.from(`${plain.toString()}${offset}[${timezone}]`, {
          offset: 'reject',
          disambiguation: 'reject',
        })
      : plain.toZonedDateTime(timezone, { disambiguation: 'reject' });
    return new Date(Number(zoned.epochMilliseconds));
  } catch {
    throw new UserError(
      'Enter a valid local date/time. For an ambiguous daylight-saving time, supply its UTC offset (e.g. -05:00).',
      'dates',
    );
  }
}
export function dateLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
export function localInput(date: Date, timezone: string) {
  return Temporal.Instant.from(date.toISOString())
    .toZonedDateTimeISO(timezone)
    .toPlainDateTime()
    .toString({ smallestUnit: 'minute' });
}
