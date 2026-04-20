import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { listDashboardRuns } from '@/lib/api';
import { pmcOverview, pmcClients } from '@/lib/pmc-content';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];
const REHYPE_PLUGINS = [rehypeHighlight];

function isPmcScoped(workflowName: string): boolean {
  return workflowName.startsWith('jid5274-') || workflowName.startsWith('pmc-');
}

export function PMCPage(): React.ReactElement {
  const {
    data: runsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['pmcRuns'],
    queryFn: () => listDashboardRuns({ limit: 25 }),
    refetchInterval: 15_000,
  });

  const pmcRuns = (runsData?.runs ?? []).filter(r => isPmcScoped(r.workflow_name)).slice(0, 5);

  const businessName = pmcOverview.frontmatter.name ?? 'PMC';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <header className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-text-primary">{businessName}</h1>
          {pmcOverview.frontmatter.website && (
            <a
              href={`https://${pmcOverview.frontmatter.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              {pmcOverview.frontmatter.website}
            </a>
          )}
        </header>

        <section className="chat-markdown max-w-none text-sm text-text-primary">
          <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
            {pmcOverview.body}
          </ReactMarkdown>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Clients</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {pmcClients.map(client => (
              <article key={client.slug} className="rounded-lg border border-border bg-surface p-4">
                <h3 className="text-sm font-medium text-text-primary">
                  {client.frontmatter.name ?? client.slug}
                </h3>
                {client.frontmatter.status && (
                  <p className="mt-1 text-xs text-text-secondary">
                    Status: {client.frontmatter.status}
                  </p>
                )}
                {client.frontmatter.owner && (
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Owner: {client.frontmatter.owner}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Recent PMC Workflow Runs</h2>
          {isLoading ? (
            <p className="text-xs text-text-tertiary">Loading…</p>
          ) : isError ? (
            <p className="text-xs text-error">Failed to load runs.</p>
          ) : pmcRuns.length === 0 ? (
            <p className="text-xs text-text-tertiary">No PMC-scoped workflow runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {pmcRuns.map(run => (
                <li
                  key={run.id}
                  className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 text-sm"
                >
                  <Link
                    to={`/workflows/runs/${run.id}`}
                    className="text-text-primary hover:text-primary"
                  >
                    {run.workflow_name}
                  </Link>
                  <span className="text-xs text-text-tertiary">{run.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
