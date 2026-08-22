'use client';

import { useQuery } from '@tanstack/react-query';

import { errorMessageOf } from '../../lib/error-message';
import { useTRPC } from '../../lib/trpc/client';

export function ExportRecordButton({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const exported = useQuery({
    ...trpc.record.export.queryOptions({ projectId }),
    enabled: false,
  });

  return (
    <div className="stack-tight">
      <button
        type="button"
        className="btn-secondary min-h-11"
        disabled={exported.isFetching}
        onClick={() => {
          void exported.refetch().then((result) => {
            if (result.data === undefined) {
              return;
            }
            const blob = new Blob([JSON.stringify(result.data, null, 2)], {
              type: 'application/json',
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `business-record-${projectId}.json`;
            anchor.click();
            URL.revokeObjectURL(url);
          });
        }}
      >
        {exported.isFetching ? 'Preparing export…' : 'Export accepted record'}
      </button>
      <p className="hint">
        Export is the versioned record, not a chat transcript. Empty sections stay empty.
      </p>
      {errorMessageOf(exported.error) === null ? null : (
        <p className="alert">{errorMessageOf(exported.error)}</p>
      )}
    </div>
  );
}
