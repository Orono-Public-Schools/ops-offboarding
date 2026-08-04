import React from 'react';
import { DayHeader } from '../../components/navigation/DayHeader.jsx';
import { Card } from '../../components/core/Card.jsx';
import { QuietLink } from '../../components/core/QuietLink.jsx';
import { StatusBadge } from '../../components/core/StatusBadge.jsx';
import { ModuleCard } from '../../components/records/ModuleCard.jsx';
import { RequestRow } from '../../components/records/RequestRow.jsx';
import { StatusTrack } from '../../components/records/StatusTrack.jsx';
import { RowList } from '../../components/forms/RowList.jsx';

const OPEN = [
  {
    title: 'Leave of absence',
    kind: 'Form 30-A · Case 26-0142 · filed 4 days ago',
    state: 'processing',
    stages: ['Filed', 'Received', 'With benefits', 'Complete'],
    current: 2,
    note: 'With benefits since Friday. Dana Whitcomb will email you.',
  },
  {
    title: 'Lane change — MA +30',
    kind: 'Form 44 · Case 26-0121 · filed 6 days ago',
    state: 'submitted',
    stages: ['Filed', 'Received', 'Board review', 'Complete'],
    current: 1,
    note: 'The board reviews lane changes on March 18.',
  },
];

export function PortalHome({ onOpen }) {
  return (
    <React.Fragment>
      <DayHeader
        weekday="Mon" day={2} month="March"
        title="Two of your requests are moving"
        subtitle="Nothing needs you today. Everything else here waits until you do."
        railPct={68} railLeft="Day 118 of 174" railRight="56 school days left"
      />

      <Card
        eyebrow="Requests"
        heading="A leave request and a lane change"
        headingRight={<StatusBadge state="submitted" label="2 open" icon={false} />}
        pad={16}
      >
        <RowList>
          {OPEN.map((r) => (
            <RequestRow
              key={r.title}
              title={r.title}
              kind={r.kind}
              status={<StatusBadge state={r.state} />}
              track={<StatusTrack stages={r.stages} current={r.current} />}
              note={r.note}
              onClick={onOpen}
            />
          ))}
        </RowList>
      </Card>

      <Card
        eyebrow="Forms"
        heading="File something"
        headingRight={<span style={{ font: 'var(--type-caption)', color: 'var(--text-placeholder)' }}>Nothing takes longer than 6 minutes</span>}
        footer={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
            <QuietLink icon="download">Find my paystubs</QuietLink>
            <QuietLink icon="mail">Ask HR a question</QuietLink>
            <QuietLink icon="fileText">See all 21 forms</QuietLink>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
          <ModuleCard icon="home" title="Change of address" description="Payroll, benefits mail, and the building directory update together." meta="4 min" onClick={onOpen} />
          <ModuleCard icon="calendar" title="Leave of absence" description="Medical, parental, family, or personal. We walk the dates with you." meta="6 min" onClick={onOpen} />
          <ModuleCard icon="fileText" title="Lane change" description="Move a lane once your transcript is on file." meta="3 min" onClick={onOpen} />
          <ModuleCard icon="mail" title="Direct deposit" description="Change the account your pay lands in." meta="2 min" onClick={onOpen} />
          <ModuleCard icon="users" title="Open enrollment" description="Closed until October. Current elections carry over." meta="Closed" disabled />
          <ModuleCard icon="logOut" title="Your last two weeks" description="Six things to hand back, in the order they come due." total={6} done={2} onClick={onOpen} />
        </div>
      </Card>
    </React.Fragment>
  );
}
