import { useEffect, useRef, useState } from 'react';
import { isIsoDate, isoToMdy, normalizeDateInput } from '../../../shared/hr/util';
import { Field } from '../../ds/components/forms/Field';
import { Icon } from '../../ds/components/core/Icon';

/**
 * The design system's date field: a normal text input (type MM-DD-YYYY
 * freely) with a calendar popover that opens on click or focus anywhere in
 * the field. Emits ISO (YYYY-MM-DD) — what the form validator requires —
 * or the raw text when it isn't a date, so validation can say so.
 */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The 42 cells (6 weeks) that display a month, starting on Sunday. */
function gridFor(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function NavButton({ dir, onClick }: { dir: 'left' | 'right'; onClick: () => void }) {
  const [hot, setHot] = useState(false);
  return (
    <button
      type="button"
      aria-label={dir === 'left' ? 'Previous month' : 'Next month'}
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        width: 26,
        height: 26,
        display: 'grid',
        placeItems: 'center',
        border: 'none',
        borderRadius: 'var(--radius-input)',
        background: hot ? 'var(--surface-inset)' : 'transparent',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: 0,
        transition: 'background var(--dur-fast) var(--ease)',
      }}
    >
      {/* The kit ships only chevronRight — the left arrow is it, turned. */}
      <span style={{ display: 'flex', transform: dir === 'left' ? 'rotate(180deg)' : 'none' }}>
        <Icon name="chevronRight" size={14} />
      </span>
    </button>
  );
}

function DayCell({
  date,
  inMonth,
  selected,
  isToday,
  onPick,
}: {
  date: Date;
  inMonth: boolean;
  selected: boolean;
  isToday: boolean;
  onPick: (d: Date) => void;
}) {
  const [hot, setHot] = useState(false);
  return (
    <button
      type="button"
      onClick={() => onPick(date)}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        width: 32,
        height: 30,
        display: 'grid',
        placeItems: 'center',
        border: 'none',
        padding: 0,
        borderRadius: 'var(--radius-input)',
        cursor: 'pointer',
        font: `${selected ? 600 : 400} 12.5px/1 var(--font-sans)`,
        fontVariantNumeric: 'tabular-nums',
        color: selected ? '#fff' : inMonth ? 'var(--dark)' : 'var(--text-placeholder)',
        background: selected ? 'var(--gradient-primary)' : hot ? 'var(--tint)' : 'transparent',
        boxShadow: isToday && !selected ? 'inset 0 0 0 1px var(--secondary)' : 'none',
        transition: 'background var(--dur-fast) var(--ease)',
      }}
    >
      {date.getDate()}
    </button>
  );
}

export function DateField({
  label,
  value,
  onChange,
  help,
  error,
  optional,
  placeholder = 'MM-DD-YYYY',
}: {
  label: string;
  /** ISO when a real date, raw text otherwise, '' when empty. */
  value: string;
  onChange: (next: string) => void;
  help?: string;
  error?: string;
  optional?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => isoToMdy(value));
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() =>
    isIsoDate(value) ? parseIso(value) : new Date(),
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  // Adopt external value changes (draft restore, clears) while not typing.
  useEffect(() => {
    if (!focused.current) setText(isoToMdy(value));
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const commit = (raw: string) => {
    const norm = normalizeDateInput(raw);
    onChange(norm);
    if (isIsoDate(norm)) {
      setText(isoToMdy(norm));
      setMonth(parseIso(norm));
    }
  };

  const pick = (d: Date) => {
    const iso = toIso(d);
    onChange(iso);
    setText(isoToMdy(iso));
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setOpen(false);
  };

  const todayIso = toIso(new Date());
  const selectedIso = isIsoDate(value) ? value : null;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <Field
        label={label}
        icon="calendar"
        value={text}
        placeholder={placeholder}
        help={help}
        error={error}
        optional={optional}
        autoComplete="off"
        onFocus={() => {
          focused.current = true;
          if (isIsoDate(value)) setMonth(parseIso(value));
          setOpen(true);
        }}
        onBlur={() => {
          focused.current = false;
          commit(text);
        }}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const raw = e.target.value;
          setText(raw);
          const norm = normalizeDateInput(raw);
          if (isIsoDate(norm)) {
            onChange(norm);
            setMonth(parseIso(norm));
          } else if (raw.trim() === '') {
            onChange('');
          }
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(text);
            setOpen(false);
          }
        }}
      />
      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          /* Keep focus in the input so blur-commit can't race a day click. */
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: 'absolute',
            zIndex: 30,
            top: 'calc(100% + 6px)',
            left: 0,
            width: 252,
            padding: 12,
            background: 'var(--surface-card)',
            border: '1px solid var(--border-input)',
            borderRadius: 'var(--radius-card)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 12px 32px rgba(0,0,0,0.10)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--dark)' }}>
              {MONTHS[month.getMonth()]} {month.getFullYear()}
            </span>
            <span style={{ display: 'flex', gap: 2 }}>
              <NavButton
                dir="left"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              />
              <NavButton
                dir="right"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              />
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 32px)',
              justifyContent: 'space-between',
              rowGap: 2,
            }}
          >
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  height: 22,
                  font: '600 10px/1 var(--font-sans)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                {d}
              </span>
            ))}
            {gridFor(month).map((d) => {
              const iso = toIso(d);
              return (
                <DayCell
                  key={iso}
                  date={d}
                  inMonth={d.getMonth() === month.getMonth()}
                  selected={iso === selectedIso}
                  isToday={iso === todayIso}
                  onPick={pick}
                />
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--divider)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange('');
                setText('');
                setOpen(false);
              }}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                font: '600 12px/1 var(--font-sans)',
                color: 'var(--text-muted)',
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(new Date())}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                font: '600 12px/1 var(--font-sans)',
                color: 'var(--primary)',
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
