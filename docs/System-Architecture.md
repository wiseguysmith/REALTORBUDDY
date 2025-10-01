# RealtorBuddy System Architecture

## 1. High-Level Overview

RealtorBuddy is a modular, agent-based system that processes leads from intake → scoring → follow-up → analytics, with scouting integrated in later phases.

**Core Modules**: Intake Agent, Scoring Agent, Follow-Up Agent, Analytics Agent.

**Extended Modules (Phase 2+)**: Scouting Agent, Voice Agent, Compliance Dashboard.

**Glue**: Orchestration layer (Semantic Kernel or LangChain-like pipeline), API integrations, database.

## 2. Modular Breakdown

### Intake Agent
- **Inputs**: manual forms, chatbot questions, imports (CSV/CRM)
- **Outputs**: standardized lead object
- **Dependencies**: Data schema, messaging layer (for chatbot)

### Scoring Agent
- **Inputs**: lead object (budget, timeline, motivation, lender status)
- **Logic**: rules-based weights + explainability cards
- **Outputs**: Hot/Warm/Nurture classification, score rationale
- **Dependencies**: Feedback loop from Analytics Agent

### Follow-Up Agent
- **Inputs**: lead state (Hot/Warm/Nurture), last contact date
- **Logic**: hybrid → auto for warm/cold, draft/approve for hot
- **Outputs**: WhatsApp/email messages, follow-up tasks
- **Dependencies**: Messaging APIs (Twilio/WhatsApp, SendGrid)

### Analytics Agent
- **Inputs**: logs of all interactions
- **Logic**: generate Daily Top 5, ROI dashboard, engagement tracking
- **Outputs**: WhatsApp/email report + dashboard view
- **Dependencies**: Data warehouse + visualization

### Scouting Agent (Phase 2)
- **Inputs**: web/social listings (Zillow, Realtor.com, FB groups)
- **Logic**: scrape/search, flag leads for review
- **Outputs**: flagged leads → Intake Agent
- **Dependencies**: web scraping APIs, compliance filters

### Voice Agent (Phase 2+)
- **V1**: Reminder Caller (safe)
- **V2**: Pre-Qualifier Caller (asks questions)
- **Outputs**: voice logs → lead updates
- **Dependencies**: Twilio Voice/AI speech recognition

## 3. Data Flow (Lead Journey)

1. **Lead Intake** → New lead captured via chatbot/manual/import
2. **Lead Scoring** → Scoring Agent applies weights + explains
3. **Follow-Up** → Follow-Up Agent sends messages (auto or draft)
4. **Engagement Logs** → Stored + passed to Analytics Agent
5. **Daily Top 5** → Analytics Agent outputs priority leads
6. **Closed/Archived/Recycle** → Lead lifecycle state updated
7. **Scouting Agent (Phase 2)** → Surfaces new potential leads to Intake
8. **Voice Agent (Phase 2+)** → Adds call-based engagement

## 4. Integrations

- **Messaging APIs**: Twilio (SMS/WhatsApp/Voice), SendGrid (email)
- **Database**: Postgres (Supabase/Firebase optional)
- **Storage**: Audit logs + lead data
- **Orchestration**: Semantic Kernel (preferred) or LangChain (future option)
- **Front-End**: React/Next.js for dashboard (ROI view, compliance logs)

## 5. Human-in-the-Loop (HITL) Points

- **Hot leads follow-up**: realtor reviews draft before sending
- **Explainability cards**: realtor sees why a score was assigned
- **Scouting**: realtor initiates contact from flagged leads
- **Compliance**: realtor approves voice outreach (Phase 2+)

## 6. Security & Compliance Architecture

- **Access Control**: OAuth (Google login)
- **Auditability**: all messages + scoring rationales logged
- **Data Retention**: realtor controls lead data; 90-day recycle policy
- **Grey Zone Strategy**: scouting only flags; contact initiated by realtor until compliance cleared
