# RealtorBuddy 🏠

> A compliance-first SaaS platform that automates the most painful parts of real estate lead generation and nurturing: intake, scoring, follow-up, and scouting.

## 🎯 Vision & Goals

RealtorBuddy saves realtors time, increases closed deals, and provides a structured system that amplifies—not replaces—their human touch.

- **Pilot**: Start with Cizar, a practicing realtor, to validate workflows and metrics
- **Positioning**: Vertical SaaS, built for real estate first with modular design for future expansion
- **Goal**: +25% engagement rate, +15% deals closed, 5-10 hrs saved weekly

## 🏗️ System Architecture

### Core Agents (Phase 1)
- **Intake Agent**: Multi-input system (manual, chatbot, CSV imports)
- **Scoring Agent**: Rules-based weighted scoring with explainability cards
- **Follow-Up Agent**: Hybrid automation (auto for warm/cold, draft-approve for hot)
- **Analytics Agent**: Daily Top 5 reports and ROI dashboard

### Extended Modules (Phase 2+)
- **Scouting Agent**: Flag leads from Zillow, FB, WhatsApp groups
- **Voice Agent**: Reminder calls → Pre-qualifier calls
- **Compliance Dashboard**: User-facing audit logs

### Tech Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: tRPC, Prisma ORM
- **Database**: PostgreSQL
- **Messaging**: Twilio (WhatsApp/SMS/Voice), SendGrid (Email)
- **Orchestration**: Semantic Kernel
- **Auth**: OAuth (Google login)

## 📊 Lead Lifecycle

```
New → Hot/Warm/Nurture → Closed → Archived → Recycle
```

- **Hot**: Contacted every 2 days, draft messages require approval
- **Warm**: Auto-contact weekly
- **Nurture**: Monthly contact with content hooks
- **Closed**: Triggers referral automation
- **Archived**: Lost leads with reason codes
- **Recycle**: Reactivated after 90 days

## 🛡️ Compliance-First Design

### Core Principles
- **Consent-First**: No outreach without clear opt-in
- **Transparency**: Realtors see why leads are scored
- **Auditability**: Every action logged permanently
- **Fair Housing Safe**: No discrimination capabilities
- **GDPR/CCPA/Do Not Call**: Compliance by design

### Audit System
- Every message, score, and decision logged
- Permanent compliance event storage
- STOP keyword + unsubscribe handling
- Grey-zone protection (scouting flags only)

## 📈 Success Metrics

### Pilot Targets (60 days)
- **Engagement Rate**: +25% (primary)
- **Deals Closed**: +15% (primary)
- **Hours Saved**: 5-10 hrs weekly (secondary)
- **Referral Rate**: ≥30% (secondary)

### SaaS Metrics (Future)
- **ROI per Lead**: Revenue vs acquisition cost
- **Active Lead Coverage**: ≥90% on-time contact
- **Automation Adoption**: System usage measurement
- **Churn Rate**: ≤5% retention

## 🚀 Roadmap

### Phase 1: Pilot (0-60 Days)
- ✅ Core 4 agents implementation
- ✅ Daily Top 5 reports via WhatsApp/email
- ✅ Explainability cards
- ✅ ROI dashboard
- ✅ Compliance framework

### Phase 2: Growth (90-180 Days)
- 🔄 Scouting Agent v1 (flag-only)
- 📞 Voice Agent v1 (Reminder Calls)
- 📊 Internal compliance dashboard
- 🌱 Referral automation

### Phase 3: SaaS Scale (6-12 Months)
- 🌍 Multi-user roles (Admin, Agent, Assistant)
- 📞 Voice Agent v2 (Pre-Qualifier Calls)
- 🔒 User-facing compliance dashboards
- 🛒 Modular marketplace hooks

### Phase 4: Expansion (12-24 Months)
- 🚀 Horizontal expansion to adjacent industries
- 🧠 Adaptive ML scoring
- 🌐 Regional compliance modes
- 🏪 Marketplace launch

## 🎯 Competitive Advantages

1. **Compliance-First SaaS** vs grey-hat competitors
2. **Daily Ritual Integration** (habit-forming Top 5 reports)
3. **Explainability & Trust** (transparent scoring)
4. **Referral Growth Loop** (built-in virality)
5. **Modular Architecture** (SaaS now, marketplace later)

## 📋 Pilot Playbook (Cizar)

### Daily Workflow
- **9am**: Receive Daily Top 5 Leads report
- **Throughout day**: Monitor automation, approve hot lead drafts
- **End of day**: Log deal progress, add manual notes

### Weekly Review
- Engagement summary review
- Lost lead analysis
- Feedback on priorities and message tone

## 🗃️ Data Model

### Core Objects
- **Lead**: Central entity with lifecycle tracking
- **User**: Multi-role system (Admin, Agent, Assistant)
- **MessageLog**: Complete communication audit trail
- **ScoreHistory**: Explainability and scoring evolution
- **ReferralLog**: Automated referral system
- **ComplianceEvent**: Permanent audit trail

### Data Retention
- **Leads**: Realtor-controlled deletion
- **Message Logs**: 12 months active, then archive
- **Compliance Events**: Permanent retention
- **Recycle Pool**: 90-day reactivation cycle

## 🛠️ Development Setup

```bash
# Install dependencies
npm install

# Set up database
npm run db:push

# Start development server
npm run dev

# Run database studio
npm run db:studio
```

## 📚 Documentation

This repository contains the complete blueprint:
- Product Requirements Document (PRD)
- System Architecture
- Module Specifications
- Data Model & Schema
- Compliance & Safety Guidelines
- Metrics & KPIs
- Pilot Playbook
- Roadmap & Phasing

## 🤝 Contributing

This is a pilot project for Cizar. All development follows the compliance-first, audit-ready architecture outlined in the documentation.

## 📄 License

Private project - All rights reserved.

---
*Last updated: 2025-01-27 15:30:00*
