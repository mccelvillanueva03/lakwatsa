'use server';
import { revalidatePath } from 'next/cache';
import { replaceDestinationImage } from '@/lib/uploads';
import { plannerToken } from '@/lib/auth';
import { actionError } from '@/lib/action-errors';
import { UserError } from '@/lib/validation';
import type { FormState } from '@/lib/form-state';
export async function uploadAction(
  id: string,
  optionId: string,
  _: FormState,
  f: FormData,
): Promise<FormState> {
  try {
    const file = f.get('image');
    const remove = f.get('remove') === 'yes';
    if (!remove && (!(file instanceof File) || !file.size))
      throw new UserError('Choose an image.', 'image');
    await replaceDestinationImage(
      await plannerToken(),
      id,
      optionId,
      remove ? null : (file as File),
    );
    revalidatePath(`/trips/${id}`);
    revalidatePath(`/trips/${id}/manage`);
    return { message: remove ? 'Image removed.' : 'Image uploaded.' };
  } catch (e) {
    return actionError(e);
  }
}
