import React from 'react';
import { DayHeader } from '../../components/navigation/DayHeader.jsx';
import { Card } from '../../components/core/Card.jsx';
import { Button } from '../../components/core/Button.jsx';
import { StatusBadge } from '../../components/core/StatusBadge.jsx';
import { InboxRow } from '../../components/records/InboxRow.jsx';
import { PersonPlate } from '../../components/records/PersonPlate.jsx';
import { EmptyState } from '../../components/records/EmptyState.jsx';
import { RowList, DetailRow } from '../../components/forms/RowList.jsx';
import { Field } from '../../components/forms/Field.jsx';

const QUEUE = [
  { id: 1, name: 'Marisol Reyes', role: 'Grade 4 teacher', building: 'Schumann', request: 'Leave of absence', kind: 'Form 30-A · Case 26-0142', state: 'processing', time: '4 days', unread: true,
    detail: [['Leave type', 'Parental'], ['First day away', 'April 13, 2026'], ['Expected return', 'June 8, 2026'], ['Coverage', 'Principal notified']] },
  { id: 2, name: 'Andre Kalu', role: 'Custodian', building: 'High School', request: 'Change of address', kind: 'Form 12-B · Case 26-0184', state: 'submitted', time: '2 days', unread: true,
    detail: [['New address', '418 Willow Dr, Long Lake MN'], ['Effective', 'March 9, 2026'], ['Payroll', 'Notified automatically']] },
  { id: 3, name: 'Priya Raman', role: 'Band director', building: 'Middle School', request: 'Lane change — MA +30', kind: 'Form 44 · Case 26-0121', state: 'processing', time: '6 days',
    detail: [['Current lane', 'MA'], ['Requested lane', 'MA +30'], ['Transcript', 'On file Feb 24']] },
  { id: 4, name: 'Grace Lindholm', role: 'School nurse', building: 'District Office', request: 'Direct deposit change', kind: 'Form 18 · Case 26-0180', state: 'submitted', time: '2 days',
    detail: [['Bank', 'Wings Credit Union'], ['Effective', 'Next pay cycle']] },
  { id: 5, name: 'Tom Eckert', role: 'Paraprofessional', building: 'Intermediate', request: 'Offboarding — final timesheet', kind: 'Checklist · Case 26-0098', state: 'completed', time: '8 days',
    detail: [['Last day', 'February 27, 2026'], ['Keys returned', 'Yes'], ['Final timesheet', 'Approved Feb 28']] },
  { id: 6, name: 'Owen Petrie', role: 'Grade 2 teacher', building: 'Schumann', request: 'Lane change — BA +45', kind: 'Form 44 · Case 26-0102', state: 'denied', time: '11 days',
    detail: [['Requested lane', 'BA +45'], ['Reason', 'Transcript not yet received'], ['Refile', 'Eligible after March 15']] },
];

export function Inbox() {
  const [selected, setSelected] = React.useState(1);
  const [filter, setFilter] = React.useState('open');
  const rows = filter === 'open' ? QUEUE.filter((q) => q.state === 'submitted' || q.state === 'processing') : QUEUE;
  const current = QUEUE.find((q) => q.id === selected);

  return (
    <React.Fragment>
      <DayHeader
        weekday="Mon" day={2} month="March"
        title="Twelve requests waiting"
        subtitle="Oldest first. Marisol's leave has been with benefits for four days — that one is overdue for a reply."
        actions={<Button variant="secondary" size="sm" icon="download">Export</Button>}
        railPct={71} railLeft="29 of 41 answered this month" railRight="12 waiting"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 24, alignItems: 'start' }}>
        <Card
          pad={16}
          eyebrow="Inbox"
          heading={filter === 'open' ? 'Leave, address changes, lane moves' : 'Everything filed this year'}
          headingRight={
            <span style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant={filter === 'open' ? 'secondary' : 'ghost'} onClick={() => setFilter('open')}>Open</Button>
              <Button size="sm" variant={filter === 'all' ? 'secondary' : 'ghost'} onClick={() => setFilter('all')}>All</Button>
            </span>
          }
        >
          <div style={{ marginBottom: 12 }}>
            <Field icon="search" placeholder="Search by name or case number" aria-label="Search submissions" />
          </div>
          {rows.length ? (
            <RowList>
              {rows.map((q) => (
                <InboxRow
                  key={q.id}
                  unread={q.unread}
                  selected={q.id === selected}
                  onClick={() => setSelected(q.id)}
                  person={<PersonPlate size="sm" name={q.name} role={q.role} meta={q.building} />}
                  request={q.request}
                  kind={q.kind}
                  status={<StatusBadge state={q.state} size="sm" />}
                  time={q.time}
                />
              ))}
            </RowList>
          ) : (
            <EmptyState on="card" icon="inbox" line="Nothing waiting on you" note="New submissions appear here the moment staff file them." />
          )}
        </Card>

        {current ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <Card eyebrow="Request" heading={current.title} headingRight={<StatusBadge state={current.state} />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div style={{ font: 'var(--type-value)', color: 'var(--dark)' }}>{current.request}</div>
                  <div style={{ font: 'var(--type-caption)', color: 'var(--text-muted)', marginTop: 2 }}>{current.kind} · filed {current.time} ago</div>
                </div>
                <PersonPlate name={current.name} role={current.role} meta={current.building} />
              </div>
            </Card>

            <Card eyebrow="Detail" heading="What was filed" inset>
              <RowList>
                {current.detail.map(([k, v]) => <DetailRow key={k} label={k} value={v} />)}
              </RowList>
            </Card>

            <Card eyebrow="Decision" heading="Your call">
              <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                <Button variant="primary" icon="check">Mark completed</Button>
                <Button variant="secondary" icon="mail">Ask a question</Button>
                <Button variant="destructive">Deny</Button>
              </div>
              <p style={{ margin: '14px 0 0', font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
                Denying sends a plain-language reason you write yourself, never a form letter.
              </p>
            </Card>
          </div>
        ) : (
          <EmptyState icon="fileText" line="Nothing selected" note="Pick a request to see what was filed." />
        )}
      </div>
    </React.Fragment>
  );
}
