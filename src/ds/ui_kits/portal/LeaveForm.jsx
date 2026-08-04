import React from 'react';
import { DayHeader } from '../../components/navigation/DayHeader.jsx';
import { Card } from '../../components/core/Card.jsx';
import { Button } from '../../components/core/Button.jsx';
import { ProgressBar } from '../../components/core/ProgressBar.jsx';
import { FormSection } from '../../components/forms/FormSection.jsx';
import { Field } from '../../components/forms/Field.jsx';
import { ChoiceRow } from '../../components/forms/ChoiceRow.jsx';

export function LeaveForm({ onSubmit, onCancel }) {
  const [kind, setKind] = React.useState('parental');
  const [coverage, setCoverage] = React.useState(false);
  const [notify, setNotify] = React.useState(true);

  return (
    <React.Fragment>
      <DayHeader
        weekday="Mon" day={2} month="March"
        title="Leave of absence"
        subtitle="Six minutes, and you can stop halfway — we keep the draft. Nothing reaches your principal until HR confirms the dates."
        railPct={67} railLeft="Step 2 of 3 · Leave details" railRight="About 3 minutes left"
      />

      <FormSection
        eyebrow="Step 1 of 3"
        title="Who's filing"
        aside={<span style={{ font: 'var(--type-caption)', color: 'var(--text-placeholder)' }}>From your record</span>}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          <Field label="Name" defaultValue="Marisol Reyes" readOnly />
          <Field label="Building" as="select" defaultValue="Schumann Elementary" options={['Schumann Elementary', 'Orono Intermediate', 'Orono Middle School', 'Orono High School', 'District Office']} />
        </div>
        <Field label="Best email while you're away" icon="mail" defaultValue="marisol.reyes@orono.k12.mn.us" help="Confirmations and any paperwork go here." />
      </FormSection>

      <FormSection eyebrow="Step 2 of 3" title="Why you're taking leave" description="Pick the closest match. If none of these fit, choose personal and tell us in your own words.">
        <div style={{ display: 'grid', gap: 8 }}>
          <ChoiceRow type="radio" name="kind" title="Parental leave" description="Birth, adoption, or foster placement." meta="up to 12 weeks" checked={kind === 'parental'} onChange={() => setKind('parental')} />
          <ChoiceRow type="radio" name="kind" title="Medical leave" description="For your own health condition." meta="14 days accrued" checked={kind === 'medical'} onChange={() => setKind('medical')} />
          <ChoiceRow type="radio" name="kind" title="Family care" description="For a spouse, child, or parent." meta="up to 12 weeks" checked={kind === 'family'} onChange={() => setKind('family')} />
          <ChoiceRow type="radio" name="kind" title="Personal leave" description="Anything else. A short note is enough." checked={kind === 'personal'} onChange={() => setKind('personal')} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          <Field label="First day away" icon="calendar" defaultValue="04 / 13 / 2026" />
          <Field label="Expected return" icon="calendar" defaultValue="06 / 08 / 2026" help="You can change this later." />
        </div>
        <Field label="Anything we should know?" as="textarea" rows={3} optional help="Only the two people who process leave will read this." />
      </FormSection>

      <FormSection eyebrow="Step 3 of 3" title="Coverage and contact" description="Two small things that make your return easier.">
        <ChoiceRow type="switch" title="I've spoken with my principal about coverage" description="We ask, but we don't check. It helps the substitute office plan." checked={coverage} onChange={() => setCoverage(!coverage)} />
        <ChoiceRow type="switch" title="Email my personal address too" description="Useful if you won't be checking district mail." checked={notify} onChange={() => setNotify(!notify)} />
      </FormSection>

      <Card pad={16}>
        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 12, alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
          <Button variant="submit" icon="send" onClick={onSubmit}>Submit request</Button>
          <Button variant="secondary" icon="save">Save draft</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <span style={{ flex: 1, minWidth: 120, font: 'var(--type-caption)', color: 'var(--text-placeholder)', textAlign: 'right' }}>Draft saved 8:41 AM</span>
        </div>
      </Card>
    </React.Fragment>
  );
}
