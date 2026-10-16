import type { AwarenessState, AwarenessUser } from '@palimpsest/core/types/awareness';
import type { Identity } from '@palimpsest/core/types/identity';
import { getIdentity } from '@palimpsest/core/utils/identity';
import { useState } from 'react';

export type { AwarenessState, AwarenessUser };

export function useIdentity(): Identity {
  const [identity] = useState(getIdentity);
  return identity;
}
