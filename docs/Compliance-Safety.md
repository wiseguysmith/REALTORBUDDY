# RealtorBuddy Compliance & Safety Guidelines

## 1. Core Principles

- **Consent-First** → No outreach without clear opt-in
- **Transparency** → Realtors see why leads are scored or contacted
- **Auditability** → Every action (message, score, opt-out) logged
- **Fair Housing Safe** → No discrimination by race, gender, religion, etc.
- **Compliance by Design** → System designed to meet GDPR/CCPA/Do Not Call best practices

## 2. Consent Management

### ✅ WhatsApp/Email Opt-In:
- Must have explicit consent before automated outreach
- Store ComplianceEvent: ConsentGiven with timestamp

### ✅ Opt-Out Handling:
- WhatsApp keyword: STOP
- Email footer: unsubscribe link
- Auto-create ComplianceEvent: OptOut

### ✅ Grey-Zone Scouting:
- Phase 1: scouting agent only flags leads (no contact)
- Realtor must manually initiate first contact
- Phase 2: explicit opt-in before automated contact begins

## 3. Audit Logging

Every compliance-sensitive action is logged in ComplianceEvent:
- Consent granted/revoked
- Opt-outs
- Automated outreach vs manual
- Lead lifecycle changes

**Retention**: permanent storage in compliance logs

## 4. Fair Housing Guardrails

**Prohibited Filters**: System cannot filter/sort based on race, religion, gender, disability, national origin, or familial status.

**Allowed Filters**: Budget, location, property type, timeline, credit/lender readiness.

**Audit Check**: Any scoring/lead suggestion must show rationale (budget, readiness, engagement) to prove neutrality.

## 5. Data Security

**Hosting**: U.S. cloud provider (AWS/GCP/Azure)

**Encryption**:
- At rest (AES-256)
- In transit (TLS 1.2+)

**Access Control**:
- OAuth login
- Role-based permissions (Admin, Agent, Assistant)

**Data Ownership**:
- Realtors own their lead data
- RealtorBuddy owns platform + aggregate anonymized insights

## 6. Voice Agent Compliance (Phase 2+)

**V1 (Reminder Calls)**: Allowed without qualification questions

**V2 (Pre-Qualifier Calls)**: Must disclose "AI agent on behalf of Cizar Realty"

**Recording**: Only with user consent (configurable)

## 7. Grey-Zone Strategy

- **Scouting Agent** → "Surfacing only" until compliance validated
- **Realtors** → initiate contact manually from flagged pool
- **Compliance Dashboard (Phase 2+)** → user-facing logs of consent & outreach history

## 8. RealtorBuddy's Differentiator

While competitors push grey-hat automation, RealtorBuddy wins by being compliance-first SaaS.

Realtors can show compliance dashboards to regulators/clients → builds trust + defensibility.
