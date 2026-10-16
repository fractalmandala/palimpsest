import { ProblemDetailsSchema } from '@palimpsest/core/schemas/api';
import { t } from '@lingui/core/macro';
import type {
  PsPackId,
  PsScaffoldApplyResult,
  PsScaffoldPlan,
  PsSeedApplyResult,
  PsSeedError,
  PsSeedListPacksResult,
  PsSeedPackInfo,
  PsSeedPlanResult,
} from '@/lib/desktop-bridge-types';
import { emitSkillsChanged } from '@/lib/documents-events';

async function translateSeedError(res: Response): Promise<PsSeedError> {
  const body = (await res.json().catch(() => null)) as unknown;
  const parsed = ProblemDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return { kind: 'internal', message: `HTTP ${res.status}` };
  }
  const message = parsed.data.detail ?? parsed.data.title;
  const t = parsed.data.type;
  if (t === 'urn:ok:error:seed-prerequisite-missing') {
    return { kind: 'prerequisite-missing', message };
  }
  if (t === 'urn:ok:error:seed-invalid-root') {
    return { kind: 'invalid-root', message };
  }
  if (t === 'urn:ok:error:no-project-dir') {
    return { kind: 'no-project', message };
  }
  return { kind: 'internal', message };
}

interface SeedPlanOptions {
  rootDir?: string;
  packId?: PsPackId;
  preview?: { skillsInstallable: boolean };
}
interface SeedApplyOptions {
  packId?: PsPackId;
}

interface SeedClientShape {
  plan: (options?: SeedPlanOptions) => Promise<PsSeedPlanResult>;
  apply: (plan: PsScaffoldPlan, options?: SeedApplyOptions) => Promise<PsSeedApplyResult>;
  listPacks: () => Promise<PsSeedListPacksResult>;
}

export function seedClient(): SeedClientShape {
  const psDesktop = typeof window !== 'undefined' ? window.psDesktop : undefined;
  if (psDesktop?.seed) {
    const desktopApply = psDesktop.seed.apply;
    return {
      plan: psDesktop.seed.plan,
      apply: async (plan, options) => {
        const result = await desktopApply(plan, options);
        if (result.ok) emitSkillsChanged();
        return result;
      },
      listPacks: psDesktop.seed.listPacks,
    };
  }
  return {
    plan: async (options?: SeedPlanOptions): Promise<PsSeedPlanResult> => {
      const params = new URLSearchParams();
      if (options?.rootDir) params.set('rootDir', options.rootDir);
      if (options?.packId) params.set('packId', options.packId);
      const qs = params.toString();
      const res = await fetch(`/api/seed/plan${qs ? `?${qs}` : ''}`);
      if (!res.ok) {
        return { ok: false, error: await translateSeedError(res) };
      }
      const body = (await res.json().catch(() => null)) as { plan?: PsScaffoldPlan } | null;
      if (!body?.plan) {
        return { ok: false, error: { kind: 'internal', message: t`Malformed plan response` } };
      }
      return { ok: true, plan: body.plan };
    },
    apply: async (plan: PsScaffoldPlan, options?: SeedApplyOptions): Promise<PsSeedApplyResult> => {
      const res = await fetch('/api/seed/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          packId: options?.packId,
        }),
      });
      if (!res.ok) {
        return { ok: false, error: await translateSeedError(res) };
      }
      const body = (await res.json().catch(() => null)) as {
        result?: PsScaffoldApplyResult;
      } | null;
      if (!body?.result) {
        return { ok: false, error: { kind: 'internal', message: t`Malformed apply response` } };
      }
      emitSkillsChanged();
      return { ok: true, result: body.result };
    },
    listPacks: async (): Promise<PsSeedListPacksResult> => {
      const res = await fetch('/api/seed/packs');
      if (!res.ok) {
        return { ok: false, error: { kind: 'internal', message: `HTTP ${res.status}` } };
      }
      const body = (await res.json().catch(() => null)) as { packs?: PsSeedPackInfo[] } | null;
      if (!body || !Array.isArray(body.packs)) {
        return {
          ok: false,
          error: { kind: 'internal', message: t`Malformed listPacks response` },
        };
      }
      return { ok: true, packs: body.packs };
    },
  };
}
