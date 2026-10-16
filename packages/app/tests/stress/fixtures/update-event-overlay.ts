import type { Page } from '@playwright/test';
import type { PsDesktopBridge } from '@/lib/desktop-bridge-types';

export type OnboardingToastPayload = Parameters<
  Parameters<PsDesktopBridge['onboarding']['onToast']>[0]
>[0];

export type SchemaIncompatibility = NonNullable<
  Awaited<ReturnType<PsDesktopBridge['state']['query']>>['schemaIncompatibility']
>;

export interface OverlayConfig {
  readonly schemaIncompatibility?: SchemaIncompatibility;
  readonly freshlyCreated?: boolean;
}

type OnboardingToastListener = (payload: OnboardingToastPayload) => void;

interface OverlayState {
  readonly onboardingToastListeners: Set<OnboardingToastListener>;
}

type OverlayWindow = Window & { __psOverlay__?: OverlayState };

interface OverlayInitArgs {
  readonly schemaIncompatibility: SchemaIncompatibility | null;
  readonly freshlyCreated: boolean;
}

export async function installUpdateEventOverlay(
  page: Page,
  config: OverlayConfig = {},
): Promise<void> {
  await page.addInitScript(
    ({ schemaIncompatibility, freshlyCreated }: OverlayInitArgs) => {
      const state: OverlayState = {
        onboardingToastListeners: new Set(),
      };
      const overlayWindow = window as OverlayWindow;
      overlayWindow.__psOverlay__ = state;

      const overlay = (bridge: PsDesktopBridge): void => {
        bridge.onboarding.onToast = (listener) => {
          state.onboardingToastListeners.add(listener);
          return () => {
            state.onboardingToastListeners.delete(listener);
          };
        };
        if (schemaIncompatibility !== null) {
          const query = bridge.state.query;
          bridge.state.query = async () => ({ ...(await query()), schemaIncompatibility });
        }
        if (freshlyCreated) {
          Object.assign(bridge.config, {
            freshlyCreated: true,
          } satisfies Partial<PsDesktopBridge['config']>);
        }
      };

      let installed: PsDesktopBridge | undefined;
      Object.defineProperty(overlayWindow, 'psDesktop', {
        configurable: true,
        enumerable: true,
        get: () => installed,
        set: (bridge: PsDesktopBridge | undefined) => {
          if (bridge !== undefined) overlay(bridge);
          installed = bridge;
        },
      });
    },
    {
      schemaIncompatibility: config.schemaIncompatibility ?? null,
      freshlyCreated: config.freshlyCreated ?? false,
    } satisfies OverlayInitArgs,
  );
}

export async function emitOnboardingToast(
  page: Page,
  payload: OnboardingToastPayload,
): Promise<void> {
  const delivered = await page.evaluate((next: OnboardingToastPayload) => {
    const state = (window as OverlayWindow).__psOverlay__;
    if (state === undefined) return -1;
    const listeners = [...state.onboardingToastListeners];
    for (const listener of listeners) listener(next);
    return listeners.length;
  }, payload);
  if (delivered === -1) {
    throw new Error('update event overlay: installUpdateEventOverlay did not run in this page');
  }
  if (delivered === 0) {
    throw new Error(
      'update event overlay: nothing subscribed to onboarding.onToast; install the overlay before the desktop bridge',
    );
  }
}

export type UpdateEventChannel = never;

export type UpdateEventPayload<C extends UpdateEventChannel> = C;

export function emitUpdateEvent(): Promise<never> {
  throw new Error('update events were removed with the auto-updater; this e2e helper is obsolete');
}

export function readRelaunchCalls(): Promise<never> {
  throw new Error('update events were removed with the auto-updater; this e2e helper is obsolete');
}

export function settleHeldRelaunch(): Promise<never> {
  throw new Error('update events were removed with the auto-updater; this e2e helper is obsolete');
}
