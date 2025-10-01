# RealtorBuddy Data Model & Schema

## 1. Core Objects

### Lead
Represents a single prospect (buyer/seller).

```javascript
Lead {
  id: UUID (PK)
  first_name: string
  last_name: string
  email: string
  phone: string
  source: enum [Referral, Zillow, Realtor.com, Social, Walk-in, Scouted, Other]
  budget: decimal
  timeline: string (e.g., "30 days", "3-6 months")
  motivation: string (free text / key life event)
  lender_status: enum [Pre-Approved, Not Applied, Unknown]
  state: enum [New, Hot, Warm, Nurture, Closed, Archived, Recycle]
  score: int (0–100)
  explainability_card: text
  last_contact_date: datetime
  next_action_date: datetime
  created_at: datetime
  updated_at: datetime
  owner_id: UUID (FK → User)
}
```

### User (Realtor)
Represents the realtor or assistant.

```javascript
User {
  id: UUID (PK)
  name: string
  email: string
  role: enum [Admin, Agent, Assistant]
  created_at: datetime
  updated_at: datetime
}
```

### Message Log
Tracks every message sent, drafted, or received.

```javascript
MessageLog {
  id: UUID (PK)
  lead_id: UUID (FK → Lead)
  user_id: UUID (FK → User, nullable if auto)
  channel: enum [WhatsApp, Email, Voice, SMS]
  direction: enum [Outbound, Inbound]
  content: text
  status: enum [Draft, Sent, Delivered, Failed, Opted-Out]
  created_at: datetime
}
```

### Score History
Keeps track of score changes for explainability + auditing.

```javascript
ScoreHistory {
  id: UUID (PK)
  lead_id: UUID (FK → Lead)
  score: int
  rationale: text
  created_at: datetime
}
```

### Referral Log
Tracks referrals triggered at closing.

```javascript
ReferralLog {
  id: UUID (PK)
  lead_id: UUID (FK → Lead)
  referred_contact: string (nullable)
  status: enum [Requested, Received, Ignored]
  created_at: datetime
}
```

### Compliance Event
Every compliance-related action.

```javascript
ComplianceEvent {
  id: UUID (PK)
  lead_id: UUID (FK → Lead)
  event_type: enum [ConsentGiven, ConsentRevoked, OptOut, AuditCheck]
  details: text
  created_at: datetime
}
```

## 2. Relationships

- **Lead ↔ User** → Each lead belongs to one realtor
- **Lead ↔ MessageLog** → All comms tied to lead
- **Lead ↔ ScoreHistory** → Tracks scoring evolution
- **Lead ↔ ReferralLog** → Auto-generated when closing
- **Lead ↔ ComplianceEvent** → Tracks opt-ins/outs

## 3. Data Retention Policy

- **Leads** = retained unless realtor deletes
- **Message Logs** = retain for 12 months, archive after
- **Compliance Events** = permanent (audit trail)
- **Recycle Pool** = re-activate leads after 90 days inactivity

## 4. Indexing & Search

- Index Lead.state, Lead.score, Lead.owner_id for fast dashboards
- Full-text search on motivation and notes
- Time-based indexing on last_contact_date for follow-up scheduling
