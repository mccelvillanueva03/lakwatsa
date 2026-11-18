'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from './ui/button';

export function TripShare({ code, title, id }: { code: string | null; title: string; id: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function share() {
    if (!code) return;
    setBusy(true);
    setMessage('');
    const url = `${window.location.origin}/invite?code=${encodeURIComponent(code)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `Join ${title}`, url });
        setMessage('Invite shared.');
      } else {
        await navigator.clipboard.writeText(url);
        setMessage('Invite link copied.');
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        setMessage('Couldn’t share. Open the trip and copy the code instead.');
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {code ? (
        <Button
          type="button"
          variant="outline"
          onClick={share}
          disabled={busy}
          aria-label={`Share ${title}`}
        >
          {message === 'Invite link copied.' ? <Check /> : <Share2 />}
          {busy ? 'Sharing…' : 'Share trip'}
        </Button>
      ) : (
        <Button asChild variant="outline">
          <Link href={`/trips/${id}/manage#invite`}>
            <Share2 />
            Set up sharing
          </Link>
        </Button>
      )}
      <span role="status" className="text-xs text-muted-foreground max-w-56">
        {message}
      </span>
    </div>
  );
}

export function TripCode({ code }: { code: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Code copied.');
    } catch {
      setMessage('Select the code above to copy it manually.');
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Current trip code</p>
      <p
        className="font-mono text-xl sm:text-2xl tracking-wider select-all break-all"
        data-testid="trip-code"
      >
        {code.match(/.{1,4}/g)?.join('-')}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy />
          Copy code
        </Button>
        <span role="status" className="text-xs text-muted-foreground">
          {message}
        </span>
      </div>
    </div>
  );
}
