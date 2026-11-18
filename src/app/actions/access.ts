'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { redeemCode, claimMember } from '@/lib/trips';
import { identity, cookieOptions } from '@/lib/auth';
import { actionError } from '@/lib/action-errors';
import type { FormState } from '@/lib/form-state';
export async function redeemAction(_: FormState, form: FormData): Promise<FormState> {
  let path: string;
  try {
    const access = await redeemCode(String(form.get('code') || ''));
    (await cookies()).set(`trip_access_${access.tripId}`, access.viewerToken, {
      ...cookieOptions,
      expires: access.expiresAt,
    });
    path = `/trips/${access.tripId}${access.mode === 'PLANNING' ? '/entry' : ''}`;
  } catch (e) {
    return actionError(e);
  }
  redirect(path);
}
export async function claimAction(
  tripId: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const session = await claimMember(
      await identity(tripId),
      tripId,
      String(form.get('memberId') || ''),
    );
    (await cookies()).set(`member_session_${tripId}`, session.token, {
      ...cookieOptions,
      expires: session.expiresAt,
    });
  } catch (e) {
    return actionError(e);
  }
  redirect(`/trips/${tripId}`);
}
