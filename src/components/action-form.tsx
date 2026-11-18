'use client';
import { createContext, useActionState, useContext, useId, useState } from 'react';
import Link from 'next/link';
import type { FormAction, FormState } from '@/lib/form-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
const State = createContext<FormState>({});
export function ActionForm({
  action,
  children,
  submit = 'Save',
  className = '',
}: {
  action: FormAction;
  children: React.ReactNode;
  submit?: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (previous, form) => {
      const result = await action(previous, form);
      return {
        ...result,
        resetKey: result.errors ? previous.resetKey : (previous.resetKey ?? 0) + 1,
      };
    },
    {},
  );
  return (
    <State.Provider value={state}>
      <form action={formAction} className={`space-y-4 ${className}`}>
        <fieldset key={state.resetKey ?? 0} disabled={pending} className="space-y-4 min-w-0">
          {children}
        </fieldset>
        {state.message && (
          <Alert
            variant={state.errors ? 'destructive' : 'default'}
            role={state.errors ? 'alert' : 'status'}
          >
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        {state.code && state.tripId && (
          <div className="invite-box space-y-3">
            <p className="eyebrow">Your private trip code</p>
            <p className="text-2xl font-mono tracking-widest break-all">
              {state.code.match(/.{1,4}/g)?.join('-')}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  .writeText(`${window.location.origin}/invite?code=${state.code}`)
                  .catch(() => {})
              }
            >
              Copy invite link
            </Button>
            <p>
              <Link href={`/trips/${state.tripId}/manage`} className="text-link">
                Manage your trip →
              </Link>
            </p>
          </div>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submit}
        </Button>
      </form>
    </State.Provider>
  );
}
export function Field({
  name,
  label,
  area,
  ...props
}: {
  name: string;
  label: string;
  area?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> & { rows?: number }) {
  const id = useId();
  const state = useContext(State);
  const errors = state.errors?.[name];
  const { defaultValue, onChange, value: suppliedValue, ...inputProps } = props;
  const [value, setValue] = useState(defaultValue ?? '');
  const common = {
    id,
    name,
    'aria-invalid': !!errors,
    'aria-describedby': errors ? `${id}-error` : undefined,
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {area ? (
        <Textarea
          {...common}
          value={String(value)}
          onChange={(event) => setValue(event.target.value)}
          required={props.required}
          rows={props.rows || 3}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
        />
      ) : (
        <Input
          {...common}
          {...inputProps}
          {...(props.type === 'file'
            ? {}
            : {
                value: suppliedValue ?? value,
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  setValue(event.target.value);
                  onChange?.(event);
                },
              })}
        />
      )}{' '}
      {errors && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {errors.join(' ')}
        </p>
      )}
    </div>
  );
}
export function SelectField({
  name,
  label,
  children,
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
  defaultValue?: string;
  required?: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue ?? '');
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required={required}
        className="native-select"
      >
        {children}
      </select>
    </div>
  );
}
export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
