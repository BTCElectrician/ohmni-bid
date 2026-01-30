'use client';

import type { ProjectInfo } from '@/lib/estimate/types';

interface ProjectDetailsProps {
  project: ProjectInfo;
  onChange: (project: ProjectInfo) => void;
}

const inputClassName =
  'mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500';

export function ProjectDetails({ project, onChange }: ProjectDetailsProps) {
  return (
    <div className="glass-panel rounded-3xl p-6">
      <div>
        <span className="badge">Project Details</span>
        <h2 className="mt-4 text-lg font-semibold text-slate-100">
          Capture the essentials.
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Capture the essentials for the estimate header and export.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-slate-300">Project Number</label>
          <input
            value={project.projectNumber || ''}
            onChange={event =>
              onChange({ ...project, projectNumber: event.target.value || undefined })
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300">Location</label>
          <input
            value={project.location || ''}
            onChange={event =>
              onChange({ ...project, location: event.target.value || undefined })
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300">GC / Owner</label>
          <input
            value={project.gcName || ''}
            onChange={event =>
              onChange({ ...project, gcName: event.target.value || undefined })
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300">Contact Name</label>
          <input
            value={project.contactName || ''}
            onChange={event =>
              onChange({ ...project, contactName: event.target.value || undefined })
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300">Prepared By</label>
          <input
            value={project.preparedBy || ''}
            onChange={event =>
              onChange({ ...project, preparedBy: event.target.value || undefined })
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300">Bid Date</label>
          <input
            type="date"
            value={project.date || ''}
            onChange={event =>
              onChange({ ...project, date: event.target.value || undefined })
            }
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-300">Square Footage</label>
          <input
            type="number"
            value={project.squareFootage ?? ''}
            onChange={event => {
              const nextValue = event.target.value;
              onChange({
                ...project,
                squareFootage: nextValue ? Number(nextValue) : undefined
              });
            }}
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
}
