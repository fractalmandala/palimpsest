import { useEffect, useRef, useState } from 'react';
import { PsBlob } from '@/components/PsBlob';
import { PsBlobRunner } from '@/components/PsBlobRunner';
import { focusIsOnAControl, gameMayHandleKey } from '@/lib/blob-run-keyboard';
import { MASCOT_VIEW_TRANSITION_NAME, withViewTransition } from '@/lib/view-transition';

const RESTING_BLOB_SIZE = 80;

interface PsBlobRunnerEasterEggProps {
  keyboard?: boolean;
}

export function PsBlobRunnerEasterEgg({ keyboard = true }: PsBlobRunnerEasterEggProps = {}) {
  const [awake, setAwake] = useState(false);
  const awakeRef = useRef(false);

  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (reduceMotion || !keyboard) return;

    function onKeyDown(event: KeyboardEvent) {
      if (awakeRef.current) return;
      const isSpace = event.key === ' ';
      if (!isSpace && event.key !== 'ArrowUp') return;
      if (!gameMayHandleKey({ allowWhileFocused: event.key === 'ArrowUp' })) return;
      event.preventDefault();
      awakeRef.current = true;
      withViewTransition(() => setAwake(true));
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reduceMotion, keyboard]);

  if (awake) return <PsBlobRunner autoStart />;

  if (reduceMotion) return <PsBlob size={RESTING_BLOB_SIZE} variant="sleeping" />;

  return (
    <div
      aria-hidden="true"
      data-slot="ps-blob-runner-easter-egg"
      className="cursor-pointer select-none transition-opacity duration-200"
      style={{ viewTransitionName: MASCOT_VIEW_TRANSITION_NAME }}
      onPointerDown={() => {
        if (focusIsOnAControl()) (document.activeElement as HTMLElement).blur();
        awakeRef.current = true;
        withViewTransition(() => setAwake(true));
      }}
    >
      <PsBlob size={RESTING_BLOB_SIZE} variant="sleeping" />
    </div>
  );
}
