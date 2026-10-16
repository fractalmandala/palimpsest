import { PALIMPSEST_SKILLS_REPO } from '@palimpsest/core/constants/skills';
import type { SkillSearchResult } from '@palimpsest/core/skills-catalog/schema';
import { useQuery } from '@tanstack/react-query';
import { discoverSkillsInSource, fetchPublisherSkills } from '@/lib/skills-api';

export function usePalimpsestSkills(enabled = true): {
  readonly skills: readonly SkillSearchResult[];
  readonly isPending: boolean;
  readonly failed: boolean;
} {
  const { data, isPending, isError } = useQuery({
    queryKey: ['skills', 'palimpsest'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SkillSearchResult[]> => {
      const [listed, ranked] = await Promise.all([
        discoverSkillsInSource(PALIMPSEST_SKILLS_REPO),
        fetchPublisherSkills(PALIMPSEST_SKILLS_REPO),
      ]);
      if (!listed.ok) throw new Error(listed.error);
      const installsByName = new Map(
        (ranked.ok ? ranked.results : []).map((r) => [r.name, r.installs]),
      );
      return (listed.skills ?? [])
        .map((s) => ({
          id: `${PALIMPSEST_SKILLS_REPO}/${s.name}`,
          name: s.name,
          source: PALIMPSEST_SKILLS_REPO,
          description: s.description ?? '',
          installs: installsByName.get(s.name) ?? null,
          publisher: PALIMPSEST_SKILLS_REPO.split('/')[0] ?? null,
        }))
        .sort((a, b) => (b.installs ?? -1) - (a.installs ?? -1));
    },
  });

  return { skills: data ?? [], isPending, failed: isError };
}
