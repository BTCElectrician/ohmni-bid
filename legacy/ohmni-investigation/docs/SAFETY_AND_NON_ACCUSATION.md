# Safety and Non-Accusation Guidelines

**Project:** ohmni-investigation  
**Version:** 1.0  
**Last Updated:** December 28, 2025

---

## Purpose

This document establishes the defamation firewall and safety protocols for ohmni-investigation to ensure responsible, evidence-based reporting that does not make unfounded accusations.

## Core Principle

**We identify signals, not crimes. We document patterns, not perpetrators.**

---

## Prohibited Language

### Absolute Prohibitions

The following terms **MUST NOT** appear in conclusions, summaries, or lead descriptions:

#### Criminal/Legal Terms
- Fraud
- Kickback
- Bribery / Bribe
- Embezzlement / Embezzle
- Illegal (when describing actions)
- Criminal
- Stole / Stolen / Theft
- Laundering
- Racketeering

#### Intent/Motive Terms
- Corrupt / Corruption
- Deliberately / Intentionally (when implying wrongdoing)
- Scheme / Scheming
- Conspiracy
- Collusion
- Cover-up

#### Character Attacks
- Dishonest
- Unethical (when describing people)
- Scam / Scammer

### Permitted Language

Use neutral, evidence-based terms:

#### Signal Language (Approved)
- Anomaly
- Pattern
- Signal
- Discrepancy
- Mismatch
- Concentration
- Risk indicator
- Warrants review
- Needs investigation
- Requires clarification
- Deviation from norm
- Unusual arrangement
- Potential concern

#### Factual Descriptors (Approved)
- Timeline inconsistency
- Reporting error
- Documentation gap
- Relationship not disclosed
- Contract awarded to...
- Payment made to...
- Increase in spending
- Change in vendor
- Lack of competitive bidding

---

## Required Elements for Every Lead

### 1. Evidence IDs
Every lead MUST reference specific evidence records by ID. No evidence = no lead.

### 2. Innocent Explanations
Every lead MUST include at least one plausible benign explanation.

**Purpose:** Prevents rush to judgment. Acknowledges that patterns may have legitimate causes.

**Examples:**
- "Vendor concentration may reflect unique expertise or certification requirements"
- "Rapid contract award may be due to documented emergency procurement authority"
- "Related party relationship may have been properly disclosed and approved"
- "Spending increase may reflect inflation or expanded program scope"
- "Reporting mismatch may be due to different accounting periods or later corrections"

### 3. Next Tests
Every lead MUST include at least one concrete, actionable test that could verify or falsify the concern.

**Purpose:** Converts suspicion into testable hypothesis. Provides roadmap for follow-up.

**Examples:**
- "Request conflict-of-interest disclosure forms for relevant time period"
- "Compare vendor rates to market benchmarks and other jurisdictions"
- "Review board meeting minutes for date of contract approval"
- "Obtain detailed scope of work to verify uniqueness claim"
- "Interview program participants to assess training quality"

---

## Status Assignment Protocol

### needs_data
- Confidence < 0.3
- Missing key information
- Evidence too thin to assess
- **Not an accusation, just insufficient information**

### under_review
- Confidence 0.3 - 0.6
- Pattern observed, monitoring for updates
- Some evidence but not conclusive
- **Not an accusation, watchful waiting**

### escalate_for_review
- Confidence > 0.6
- Strong evidence-backed signal
- **Means:** This pattern is strong enough to warrant formal review by appropriate oversight body
- **Does NOT mean:** Wrongdoing confirmed
- **Does NOT mean:** Legal violation occurred
- **Does NOT mean:** Anyone is guilty of anything

### resolved
- Innocent explanation confirmed with evidence
- Pattern explained by later information
- Signal turns out to be benign

### closed
- No longer relevant
- Overtaken by events
- Insufficient evidence after follow-up

---

## Redaction Requirements

### Personal Information (Must Redact in Public Artifacts)
- Home addresses
- Personal phone numbers
- Personal email addresses
- Bank account numbers
- Social security numbers
- Driver's license numbers

### Professional Information (Do NOT Redact)
- Business addresses
- Official titles and roles
- Publicly listed business phone/email
- Professional affiliations
- Contract amounts and terms
- Public meeting attendance

---

## Escalation Definition

**What "escalate_for_review" means:**

✅ **Correct Interpretation:**
- This pattern is supported by strong evidence
- This warrants attention from qualified oversight personnel
- This should be examined more closely by appropriate authorities
- This rises above the threshold for preliminary inquiry

❌ **Incorrect Interpretation:**
- This is proof of wrongdoing
- This person/entity is guilty
- This is illegal activity
- This should result in prosecution

**Appropriate Follow-Up:**
- Referral to government inspector general
- Sharing with investigative journalists
- Submission to ethics commission
- Request for clarification from involved parties

**Inappropriate Follow-Up:**
- Public accusations of criminality
- Demands for resignation or termination
- Calls for arrest or prosecution
- Reputational attacks

---

## Review Process

### Automated Safety (Pre-Commit)
1. **Schema Validation:** Ensures all leads have evidence_ids, innocent_explanations, next_tests
2. **Text Linting:** Blocks commits containing banned terms
3. **Confidence Check:** Flags leads with confidence > 0.8 for manual review

### Manual Review (Post-Generation, Pre-Publication)
1. Read each lead with confidence > 0.6
2. Verify evidence_ids point to real, relevant evidence
3. Assess whether innocent_explanations are genuinely plausible
4. Confirm next_tests are actionable and specific
5. Check for any implicit accusations or character attacks

### Community Feedback (Post-Publication)
1. Monitor GitHub issues for correction requests
2. Respond within 7 days
3. Publish corrections if warranted
4. Preserve historical record with correction note

---

## Examples

### ❌ Bad Lead (Prohibited)

**Title:** "City Official Takes Kickbacks from Training Vendor"

**Why bad:**
- Asserts criminal act ("kickbacks")
- Asserts guilt ("takes")
- No innocent explanation
- No evidence IDs
- No next tests

### ✅ Good Lead (Approved)

**Title:** "Training Contract Awards Concentrated with Single Vendor Following Official's Prior Employment"

**Signal Category:** related_party_risk

**Summary:**
Between 2022 and 2024, Vendor ABC received 73% of training contracts from Agency XYZ. Lead official at Agency XYZ was employed by Vendor ABC from 2018-2021. Employment relationship documented in public LinkedIn profile. No conflict-of-interest disclosure found in available meeting minutes.

**Evidence IDs:** ev_a1b2c3d4e5f6g7h8, ev_i9j0k1l2m3n4o5p6

**Innocent Explanations:**
- Vendor ABC may be sole provider meeting specialized certification requirements
- Prior employment may have been disclosed through channels not in public meeting minutes
- Selection may have been made by other officials without prior-employment knowledge

**Next Tests:**
- Request conflict-of-interest disclosure forms from Agency XYZ for 2022-2024
- Review Request for Proposal documents to assess whether requirements favor Vendor ABC
- Identify other qualified vendors in market and determine if they submitted bids

**Confidence:** 0.68  
**Status:** escalate_for_review

---

## Training for Contributors

Anyone generating content for ohmni-investigation must understand:

1. **Presumption of Innocence:** Everyone is innocent until proven guilty in court of law
2. **Signal vs. Conclusion:** We report patterns, not verdicts
3. **Evidence Standard:** Every claim must have public evidence
4. **Falsifiability:** Every concern must have a test that could disprove it
5. **Language Discipline:** No accusatory language, ever

---

## Legal Disclaimer

This project:
- Does not conduct legal investigations
- Does not have subpoena power
- Does not have access to non-public information
- Does not make determinations of guilt or innocence
- Does not constitute legal advice
- Is not a substitute for proper regulatory oversight

All findings are preliminary signals based on publicly available information only.

---

## Questions?

If uncertain whether a lead complies with these guidelines, ask:

1. Does it assert guilt or wrongdoing? → **If yes, rewrite**
2. Does it include plausible innocent explanations? → **If no, add them**
3. Does it propose testable next steps? → **If no, add them**
4. Does it use prohibited language? → **If yes, replace with approved terms**
5. Could this harm someone's reputation unfairly? → **If yes, revise or remove**

**When in doubt, err on the side of caution.**

---

*This document is binding for all ohmni-investigation content generation.*

