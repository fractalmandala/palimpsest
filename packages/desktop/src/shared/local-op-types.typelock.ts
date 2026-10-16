import type {
  AuthEvent,
  AuthReposResponse,
  AuthStatusResponse,
  RawCloneEvent,
} from '@palimpsest/server';
import type {
  PsLocalOpAuthEvent,
  PsLocalOpAuthReposResponse,
  PsLocalOpAuthStatusResponse,
  PsLocalOpCloneEvent,
} from './bridge-contract.ts';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type AssignableTo<A, B> = [A] extends [B] ? true : false;
type WithoutGhAvailable<T> = T extends unknown ? Omit<T, 'ghAvailable'> : never;

export type PinAuthEventIdenticalToBridge = Expect<Equal<AuthEvent, PsLocalOpAuthEvent>>;

export type PinCloneEventIdenticalToBridge = Expect<Equal<RawCloneEvent, PsLocalOpCloneEvent>>;

export type PinAuthReposResponseIdenticalToBridge = Expect<
  Equal<AuthReposResponse, PsLocalOpAuthReposResponse>
>;

export type PinAuthStatusResponseAssignableToBridge = Expect<
  AssignableTo<AuthStatusResponse, PsLocalOpAuthStatusResponse>
>;

export type PinAuthStatusResponseWidenedOnlyByGhAvailable = Expect<
  Equal<AuthStatusResponse, WithoutGhAvailable<PsLocalOpAuthStatusResponse>>
>;
