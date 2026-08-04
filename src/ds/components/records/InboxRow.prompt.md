```jsx
<InboxRow unread
  person={<PersonPlate size="sm" name="Andre Kalu" role="Custodian" />}
  request="Change of address" kind="Form 12-B · Case 26-0184"
  status={<StatusBadge state="submitted" />} time="2 days" onClick={open} />
```

Wrap a run of rows in `<RowList>` inside one card — never one card per row.
