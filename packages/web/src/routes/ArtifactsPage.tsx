import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';

interface ArtifactEntry {
  filename: string;
  title: string;
  href: string;
  sizeBytes: number;
  updatedAt: string;
}

interface ArtifactManifest {
  generatedAt: string;
  artifacts: ArtifactEntry[];
}

const manifestUrl = '/artifacts/manifest.json';

function formatSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function ArtifactsPage(): React.ReactElement {
  const [manifest, setManifest] = useState<ArtifactManifest | null>(null);
  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(manifestUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Unable to load artifact manifest (${response.status})`);
        }
        return response.json() as Promise<ArtifactManifest>;
      })
      .then((data): void => {
        if (cancelled) return;
        setManifest(data);
        setSelectedHref(data.artifacts[0]?.href ?? null);
      })
      .catch((err: unknown): void => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load artifacts');
      });

    return (): void => {
      cancelled = true;
    };
  }, []);

  const selectedArtifact = useMemo(
    () => manifest?.artifacts.find(artifact => artifact.href === selectedHref) ?? null,
    [manifest, selectedHref]
  );

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-secondary">
        {error}
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-secondary">
        Loading artifacts...
      </div>
    );
  }

  if (manifest.artifacts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-text-secondary">
        No HTML artifacts have been synced yet.
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] bg-background">
      <aside className="min-h-0 overflow-y-auto border-r border-border bg-surface">
        <div className="border-b border-border p-4">
          <h1 className="text-sm font-semibold text-text-primary">Artifacts</h1>
          <p className="mt-1 text-xs text-text-secondary">
            Synced {formatDate(manifest.generatedAt)}
          </p>
        </div>
        <div className="space-y-1 p-2">
          {manifest.artifacts.map(artifact => {
            const isSelected = artifact.href === selectedArtifact?.href;
            return (
              <button
                key={artifact.filename}
                type="button"
                onClick={() => {
                  setSelectedHref(artifact.href);
                }}
                className={`flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                }`}
              >
                <FileText className="mt-0.5 h-4 w-4 flex-none" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{artifact.title}</span>
                  <span className="mt-1 block text-xs opacity-75">
                    {formatSize(artifact.sizeBytes)} | {formatDate(artifact.updatedAt)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">
              {selectedArtifact?.title}
            </h2>
            <p className="truncate text-xs text-text-secondary">{selectedArtifact?.filename}</p>
          </div>
          {selectedArtifact && (
            <a
              href={selectedArtifact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-muted hover:text-text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          )}
        </div>
        {selectedArtifact && (
          <iframe
            key={selectedArtifact.href}
            title={selectedArtifact.title}
            src={selectedArtifact.href}
            className="min-h-0 flex-1 border-0 bg-white"
          />
        )}
      </section>
    </div>
  );
}
