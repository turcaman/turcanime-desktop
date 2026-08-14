import type { AnimeRelations } from '../../types';

export interface RelatedItem {
  slug: string;
  name: string;
  poster: string;
  label: string | null;
}

const RELATION_LABELS: Record<'prequel' | 'sequel', string> = {
  prequel: 'Precuela',
  sequel: 'Secuela',
};

// Flattens the three relation groups into a single list in stable order
// (prequel -> sequel -> related), tagging each item with its group label so
// the detail header can badge them. Unlabeled "related" items have no badge.
export function buildRelationsList(relations: AnimeRelations): RelatedItem[] {
  return (['prequel', 'sequel', 'related'] as const).flatMap((group) =>
    relations[group].map((item) => ({
      slug: item.slug,
      name: item.name,
      poster: item.poster,
      label: group === 'related' ? null : RELATION_LABELS[group],
    })),
  );
}
