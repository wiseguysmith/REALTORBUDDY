# RealtorBuddy Module Specs

## 1. Intake Agent

**Purpose**: Capture new leads through manual input, chatbot conversations, or imports. Standardize them into the Lead Object.

**Inputs**:
- Manual form (dashboard/CSV)
- Chatbot Q&A (budget, timeline, motivation, lender status)
- Scouting Agent flagged leads (Phase 2+)

**Outputs**:
- Lead Object → stored in DB
- Status = New

**Logic**:
- Validate mandatory fields (budget, timeline, contact info)
- Normalize data (dates, phone numbers, email)

**Edge Cases**:
- Missing fields → mark Incomplete
- Duplicate detection → merge or alert user

## 2. Scoring Agent

**Purpose**: Prioritize leads using a rules-based weighted model. Show "explainability cards" so realtors trust the score.

**Inputs**:
- Lead Object fields: budget, timeline, motivation, pre-approval, responsiveness

**Outputs**:
- Lead Score (0–100)
- Lead Status = Hot / Warm / Nurture
- Explainability Card ("Hot because relocating in 30 days + pre-approved")

**Logic**:
- Hot = high budget + short timeline + engaged
- Warm = medium budget + undecided timeline
- Nurture = long timeline or low engagement

**Edge Cases**:
- Missing lender info → mark as Nurture until filled
- Overwrites → always keep last valid score, log history

## 3. Follow-Up Agent

**Purpose**: Automate outreach cadence across WhatsApp + email. Hybrid model: auto for warm/cold, draft-approve for hot.

**Inputs**:
- Lead Object (state = Hot/Warm/Nurture)
- Last contact date
- Templates (default from Cizar, customizable later)

**Outputs**:
- WhatsApp/email message (auto or draft)
- Scheduled next action

**Logic**:
- Hot → draft message → realtor approves → send
- Warm → auto message every 7 days
- Nurture → auto message every 30 days with content hooks

**Edge Cases**:
- Duplicate outreach → block if last contact <24h
- Opt-out → mark "Do Not Contact"

## 4. Analytics Agent

**Purpose**: Show ROI + daily priorities.

**Inputs**:
- Engagement logs
- Lead lifecycle changes (Closed, Archived)

**Outputs**:
- Daily Top 5 report (WhatsApp/email at 9am)
- ROI Dashboard (hours saved, deals closed, referrals triggered)

**Logic**:
- Rank leads = (score × engagement recency)
- Track hours saved (automation logs vs manual estimates)
- Trigger referral request message after "Closed" state

**Edge Cases**:
- No Hot leads → fallback message: "No priority leads today, focus on nurture pool"
- ROI calculation fallback = hours saved only if deal data missing

## 5. Scouting Agent (Phase 2+)

**Purpose**: Surface new opportunities from external platforms.

**Inputs**:
- Zillow/Realtor.com/FB group APIs or scrapers
- Keywords/filters set by realtor

**Outputs**:
- Candidate leads → Intake Agent
- Tags: "Scouted," source metadata

**Logic**:
- Phase 1: flag leads only
- Phase 2: capture contact info where public
- Phase 3: opt-in direct contact (grey zone)

**Edge Cases**:
- No results → log "0 leads found"
- Compliance filters block flagged categories

## 6. Voice Agent (Phase 2+)

**Purpose**: Add call-based engagement.

**Inputs**:
- Lead Object (contact number, state)
- Script (reminder vs pre-qualifier)

**Outputs**:
- Call placed (Twilio)
- Transcript → stored in logs
- Lead status update (if pre-qualified)

**Logic**:
- V1 = Reminder calls ("Reminder about your showing tomorrow")
- V2 = Pre-qualifier calls ("Are you pre-approved? What's your timeline?")

**Edge Cases**:
- No answer → schedule retry
- Bad number → mark invalid
