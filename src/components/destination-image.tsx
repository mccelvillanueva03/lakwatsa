'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
export function DestinationImage({ url, name }: { url?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element -- Fixed-height Blob images use a graceful fallback.
    <img
      src={url}
      alt={name}
      className="w-full h-40 object-cover rounded-lg mb-4"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className="h-24 mb-4 rounded-lg bg-secondary flex items-center justify-center"
      role="img"
      aria-label={`${name} destination`}
    >
      <MapPin className="text-primary/50" size={28} />
    </div>
  );
}
