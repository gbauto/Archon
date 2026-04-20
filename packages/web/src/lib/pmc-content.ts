import overviewRaw from '@second-brain/businesses/pmc/overview.md?raw';
import ewcRaw from '@second-brain/businesses/pmc/clients/ewc.md?raw';
import precisionRaw from '@second-brain/businesses/pmc/clients/precision-health.md?raw';
import { parseFrontmatter, type PmcDoc } from './pmc-frontmatter';

export type { PmcDoc } from './pmc-frontmatter';

export interface PmcClient extends PmcDoc {
  slug: string;
}

export const pmcOverview: PmcDoc = parseFrontmatter(overviewRaw);

export const pmcClients: PmcClient[] = [
  { slug: 'ewc', ...parseFrontmatter(ewcRaw) },
  { slug: 'precision-health', ...parseFrontmatter(precisionRaw) },
];
