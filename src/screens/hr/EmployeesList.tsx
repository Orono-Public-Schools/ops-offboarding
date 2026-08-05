import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useHrCtx } from './HRModule';
import { ImportCard } from './ImportCard';
import {
  displayName,
  EMPLOYEE_STATUS_BADGE,
  type EmployeeDoc,
  type EmployeeStatus,
} from '../../lib/hr';
import { Button } from '../../ds/components/core/Button';
import { Card } from '../../ds/components/core/Card';
import { StatusBadge } from '../../ds/components/core/StatusBadge';
import { Field } from '../../ds/components/forms/Field';
import { RowList } from '../../ds/components/forms/RowList';
import { EmptyState } from '../../ds/components/records/EmptyState';
import { InboxRow } from '../../ds/components/records/InboxRow';
import { PersonPlate } from '../../ds/components/records/PersonPlate';

type FilterKey = 'all' | EmployeeStatus;
const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'prospective', label: 'Prospective' },
  { key: 'on_leave', label: 'On leave' },
  { key: 'terminated', label: 'Terminated' },
];

function matches(e: EmployeeDoc, needle: string): boolean {
  if (!needle) return true;
  const hay = [
    e.nameRaw,
    e.firstName,
    e.lastName,
    e.email,
    e.position,
    e.building,
    e.description,
    e.employeeId ? String(e.employeeId) : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return needle
    .toLowerCase()
    .split(/\s+/)
    .every((term) => hay.includes(term));
}

export function EmployeesList() {
  const navigate = useNavigate();
  const { employees } = useHrCtx();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const all = employees.items ?? [];
  const filtered = all.filter(
    (e) => (filter === 'all' || e.status === filter) && matches(e, search.trim()),
  );

  return (
    <>
      <Card
        eyebrow="Employees"
        heading={filter === 'all' ? 'Everyone on file' : `Showing ${filter.replace('_', ' ')}`}
        headingRight={
          <Button
            size="sm"
            variant="primary"
            icon="plus"
            onClick={() => navigate('/hr/employees/new')}
          >
            New employee
          </Button>
        }
        pad={16}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 240px' }}>
              <Field
                icon="search"
                placeholder="Search name, EE#, building, position…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? 'primary' : 'ghost'}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          {employees.loading ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Loading…
            </p>
          ) : employees.error ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--accent)', margin: 0 }}>
              {employees.error}
            </p>
          ) : filtered.length === 0 ? (
            <EmptyState
              on="card"
              icon="users"
              line={all.length === 0 ? 'Nobody on file yet' : 'Nobody matches that'}
              note={
                all.length === 0
                  ? 'Import the master sheet below, or add someone by hand.'
                  : 'Try fewer words, or clear the status filter.'
              }
            />
          ) : (
            <RowList>
              {filtered.map((e) => {
                const badge = EMPLOYEE_STATUS_BADGE[e.status] ?? EMPLOYEE_STATUS_BADGE.active;
                const role = [e.position, e.building].filter(Boolean).join(' · ');
                return (
                  <InboxRow
                    key={e.id}
                    person={
                      <PersonPlate size="sm" name={displayName(e)} role={role || e.email || ''} />
                    }
                    request={e.employeeId ? `EE# ${e.employeeId}` : 'No EE# yet'}
                    kind={e.kind === 'ce_sub_coach' ? 'CE / Sub / Coaching' : undefined}
                    status={<StatusBadge state={badge.state} label={badge.label} />}
                    onClick={() => navigate(`/hr/employees/${e.id}`)}
                  />
                );
              })}
            </RowList>
          )}
        </div>
      </Card>

      <ImportCard defaultOpen={!employees.loading && all.length === 0} />
    </>
  );
}
