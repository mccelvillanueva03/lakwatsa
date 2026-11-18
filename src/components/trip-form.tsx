'use client';
import { useState } from 'react';
import { createTripAction } from '@/app/actions/trips';
import { ActionForm, Field } from './action-form';
import { Button } from './ui/button';
export function TripForm() {
  const [mode, setMode] = useState('PLANNING'),
    [contributions, setContributions] = useState(true),
    [windows, setWindows] = useState(2);
  return (
    <ActionForm action={createTripAction} submit="Create trip">
      <Field
        name="title"
        label="Trip name"
        placeholder="A little escape with the gang"
        maxLength={100}
        required
      />
      <Field name="description" label="Description (optional)" area maxLength={2000} />
      <Field
        name="timezone"
        label="Trip timezone"
        defaultValue="Asia/Manila"
        placeholder="Asia/Manila"
        required
      />
      <div className="space-y-2">
        <label htmlFor="mode">How far along are you?</label>
        <select
          id="mode"
          name="mode"
          className="native-select"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setWindows(e.target.value === 'PLANNING' ? 2 : 1);
          }}
        >
          <option value="PLANNING">Planning — let everyone vote</option>
          <option value="PLANNED">Planned — the details are settled</option>
        </select>
      </div>
      <Field
        name="members"
        label="Member names — one per line"
        area
        required
        placeholder={'Ana\nBen\nYou'}
      />
      <Field
        key={`dest-${mode}`}
        name="destinations"
        label={
          mode === 'PLANNING'
            ? 'Destination options — at least two, one per line'
            : 'Settled destination'
        }
        area={mode === 'PLANNING'}
        required
      />
      <div className="space-y-4">
        <p className="font-medium">
          {mode === 'PLANNING' ? 'Date options — at least two' : 'Settled dates'}
        </p>
        <p className="text-sm text-muted-foreground">
          Enter local times in the trip timezone. Only ambiguous daylight-saving times need an
          offset.
        </p>
        {Array.from({ length: windows }, (_, i) => (
          <div className="rounded-xl border p-4 space-y-3" key={i}>
            <p className="eyebrow">Window {i + 1}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field name="start" label={`Start ${i + 1}`} type="datetime-local" required />
              <Field name="end" label={`End ${i + 1}`} type="datetime-local" required />
            </div>
            <details>
              <summary className="text-sm cursor-pointer">
                UTC offsets for ambiguous times (optional)
              </summary>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                <Field name="startOffset" label={`Start offset ${i + 1}`} placeholder="-05:00" />
                <Field name="endOffset" label={`End offset ${i + 1}`} placeholder="-05:00" />
              </div>
            </details>
          </div>
        ))}
        {mode === 'PLANNING' && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWindows((v) => v + 1)}
              disabled={windows >= 30}
            >
              Add date window
            </Button>
            {windows > 2 && (
              <Button type="button" variant="ghost" onClick={() => setWindows((v) => v - 1)}>
                Remove last window
              </Button>
            )}
          </div>
        )}
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          name="contributionsEnabled"
          checked={contributions}
          onChange={(e) => setContributions(e.target.checked)}
        />
        Track member contributions
      </label>
      {contributions && (
        <Field
          key={`amount-${mode}`}
          name="contributions"
          label={
            mode === 'PLANNING'
              ? 'Per-member amount options — at least two, one per line'
              : 'Per-member contribution target'
          }
          area={mode === 'PLANNING'}
          placeholder={mode === 'PLANNING' ? '1500.00\n2000.00' : '1500.00'}
          required
        />
      )}
      <p className="text-sm text-muted-foreground">
        Anyone with your code can see member names, votes, and exact payments. Share it with people
        you trust.
      </p>
    </ActionForm>
  );
}
