import React from 'react';
import { DayHeader } from '../../components/navigation/DayHeader.jsx';
import { Card } from '../../components/core/Card.jsx';
import { Button } from '../../components/core/Button.jsx';
import { ChecklistItem } from '../../components/records/ChecklistItem.jsx';
import { RowList, DetailRow } from '../../components/forms/RowList.jsx';

const TASKS = [
  { title: 'Confirm your last working day', description: 'June 5, 2026 — the last day of the student year.', state: 'done', due: 'Done Mar 1' },
  { title: 'Final timesheet approved', description: 'Your principal signs this; nothing for you to do.', state: 'done', owner: 'With Lisa Haugen', due: 'Done Mar 2' },
  { title: 'Choose what happens to your benefits', description: 'Continue through August, or end coverage on your last day.', state: 'todo', due: 'By May 29' },
  { title: 'Return classroom keys', description: 'Drop them at the front office; they log it the same day.', state: 'waiting', owner: 'With Facilities', icon: 'key', due: 'By Jun 5' },
  { title: 'Return laptop and charger', description: 'Tech wipes it while you wait, about ten minutes.', state: 'todo', icon: 'laptop', due: 'By Jun 5' },
  { title: 'Leave a forwarding address', description: 'For your final W-2 and any retirement mail.', state: 'todo', icon: 'mail', due: 'By Jun 12' },
];

export function Offboarding() {
  const [tasks, setTasks] = React.useState(TASKS);
  const done = tasks.filter((t) => t.state === 'done').length;
  const pct = (done / tasks.length) * 100;
  const toggle = (i) => setTasks((prev) => prev.map((t, j) => (j === i ? { ...t, state: t.state === 'done' ? 'todo' : 'done' } : t)));

  return (
    <React.Fragment>
      <DayHeader
        weekday="Tue" day={26} month="May"
        title="Your last two weeks"
        subtitle="Six things, in the order they come due. Two are already handled — the rest stay here so nothing surprises you in July."
        railPct={pct} railLeft={`${done} of 6 handled`} railRight="10 working days left · last day June 5"
      />

      <Card eyebrow="Checklist" heading="In the order they come due" pad={16}>
        <RowList>
          {tasks.map((t, i) => (
            <ChecklistItem
              key={t.title}
              state={t.state}
              title={t.title}
              description={t.description}
              owner={t.owner}
              icon={t.icon}
              due={t.due}
              onToggle={() => toggle(i)}
            />
          ))}
        </RowList>
      </Card>

      <Card eyebrow="Access" heading="What stays open after June 6">
        <RowList>
          <DetailRow label="Portal access" value="Read-only, indefinitely" />
          <DetailRow label="Paystubs and W-2" value="Still available to you" />
          <DetailRow label="If you return" value="Your record picks up where it left off" />
        </RowList>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" icon="mail">Email me this checklist</Button>
          <Button variant="ghost" size="sm" icon="download">Download as PDF</Button>
        </div>
      </Card>
    </React.Fragment>
  );
}
