import { SignalCard } from './SignalCard';
import type { Signal } from '@/types/signal';

interface SignalGridProps {
  signals: Signal[];
  onSignalClick: (signal: Signal) => void;
}

export function SignalGrid({ signals, onSignalClick }: SignalGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
      {signals.map((signal) => (
        <SignalCard
          key={signal.id}
          signal={signal}
          onClick={() => onSignalClick(signal)}
        />
      ))}
    </div>
  );
}
