'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { register, login, logout, updateAccount } from '@/lib/auth-service';
import { plannerToken, setPlannerCookie } from '@/lib/auth';
import { actionError } from '@/lib/action-errors';
import type { FormState } from '@/lib/form-state';
function safeReturnTo(value: string) {
  return value.startsWith('/trips/') && value.endsWith('/entry') ? value : '/dashboard';
}
export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const session = await register(
      String(form.get('email') || ''),
      String(form.get('password') || ''),
    );
    await setPlannerCookie(session);
  } catch (e) {
    return actionError(e);
  }
  redirect(safeReturnTo(String(form.get('returnTo') || '')));
}
export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const session = await login(
      String(form.get('identifier') || ''),
      String(form.get('password') || ''),
    );
    await setPlannerCookie(session);
  } catch (e) {
    return actionError(e);
  }
  redirect(safeReturnTo(String(form.get('returnTo') || '')));
}
export async function logoutAction() {
  await logout(await plannerToken());
  (await cookies()).delete('planner_session');
  redirect('/');
}
export async function accountAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    const result = await updateAccount(
      await plannerToken(),
      form.get('change') === 'password'
        ? {
            currentPassword: String(form.get('currentPassword') || ''),
            password: String(form.get('password') || ''),
          }
        : { username: String(form.get('username') || '') },
    );
    if (result) await setPlannerCookie(result);
    revalidatePath('/account');
    return { message: 'Account updated.' };
  } catch (e) {
    return actionError(e);
  }
}
