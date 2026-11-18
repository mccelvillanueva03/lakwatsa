import 'server-only';
import { put, del } from '@vercel/blob';
import { withOwnedTrip } from './trips';
import { UserError } from './validation';
async function validateImage(file: File) {
  if (!file.size || file.size > 4 * 1024 * 1024)
    throw new UserError('Choose an image up to 4 MiB.', 'image');
  const b = Buffer.from(await file.slice(0, 16).arrayBuffer());
  const valid =
    file.type === 'image/png'
      ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : file.type === 'image/jpeg'
        ? b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255
        : file.type === 'image/webp'
          ? b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
          : false;
  if (!valid) throw new UserError('Choose a JPEG, PNG, or WebP image.', 'image');
}
export async function replaceDestinationImage(
  token: string | undefined,
  tripId: string,
  optionId: string,
  file: File | null,
) {
  await withOwnedTrip(token, tripId, async (_, trip) => {
    if (!trip.destinations.some((d) => d.id === optionId))
      throw new UserError('Destination unavailable.');
  });
  let newUrl: string | null = null;
  if (file) {
    await validateImage(file);
    const blob = await put(`destinations/${tripId}/${optionId}`, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type,
    });
    newUrl = blob.url;
  }
  let old: string | null;
  try {
    old = await withOwnedTrip(token, tripId, async (tx, trip) => {
      const option = trip.destinations.find((d) => d.id === optionId);
      if (!option) throw new UserError('Destination unavailable.');
      await tx.orm.public.DestinationOption.where({ id: optionId }).update({ imageUrl: newUrl });
      return option.imageUrl;
    });
  } catch (error) {
    if (newUrl) await del(newUrl).catch(() => console.error('Unreferenced image cleanup failed'));
    throw error;
  }
  if (old && old !== newUrl)
    await del(old).catch(() => console.error('Replaced image cleanup failed'));
}
