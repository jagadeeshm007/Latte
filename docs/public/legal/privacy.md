---
title: Privacy policy
description: What personal data the hosted Latte service handles, why, where, for how long, and your rights.
section: Legal
order: 2
---

# Privacy policy

Effective 23 October 2026.

This policy explains how the hosted Latte service handles personal data, following India's Digital Personal Data Protection Act, 2023 (DPDP Act) and the Information Technology Act, 2000. Latte is an open-source project run by Jagadeesh Mandala, an individual.

## Who decides what

- **Calls and their contents.** Your organisation chooses what calls to upload and why, so for that data it is the Data Fiduciary under the DPDP Act, and Latte processes the data on its behalf. If you were a party to a recorded call, please contact the organisation you spoke to first.
- **Accounts.** For the details needed to run your account, Jagadeesh Mandala is responsible.

## What is collected

| Data | Examples | From |
| --- | --- | --- |
| Account | name, work email, role, the agent record you are linked to | the manager who invites you, and you |
| Call recordings | stereo audio files | your organisation |
| Transcripts and results | what was said, scores, findings, quotes, reviews, coaching notes | produced by the service, and by reviewers |
| Personal data inside calls | names, phone, card, Aadhaar, PAN or account numbers spoken on a call | the people on the call, through your organisation |
| Security and audit | sign-in sessions, API key metadata (keys are stored only as a hash), request logs (route, status, time, request id; never the body), audit events such as who played a recording | the service |
| Usage | calls processed and model costs, for monthly statements | the service |
| Site analytics | page views, counted without cookies or personal identifiers | Vercel Web Analytics |

## Why it is used

To provide the service you asked for: transcribe and translate calls, score them, show and export results, send notifications, digests, alerts and webhooks; to keep the service secure and find faults; and to show usage. Personal data is not sold, not used for advertising, and not used to train AI models by this service.

## Masking of personal data

Card numbers, Indian mobile numbers, Aadhaar, PAN, IFSC codes, account-like numbers and email addresses found in transcripts are masked when shown in the app, in exports, through the API and in webhooks, for example `[card ••••1234]`. The stored transcript is not changed, so QA reviewers and managers can reveal the original on a call page when they need it, and each reveal is recorded.

## Where it is processed

The database, sign-in, file storage and the API run in Mumbai, India (Supabase `ap-south-1`, Vercel `bom1`). To transcribe and score calls, audio and transcript text are sent to AI model providers, some of which may process them outside India. The current list, with what each one does, is on the [Subprocessors](subprocessors.md) page.

## How long it is kept

- **Recordings** are deleted automatically after the retention period your organisation sets for each team (90 days unless changed).
- **Transcripts, scores and findings** are kept until a manager deletes the call, or the organisation asks for its data to be deleted.
- **Accounts** stay until a manager turns them off and asks for deletion.
- **Logs and audit events** are kept as long as needed for security and to answer questions about access.

## Security

All traffic is encrypted (HTTPS). Access is invite-only and by role, the database enforces row-level security, API keys are stored only as hashes and carry scopes, webhook signing secrets are encrypted, and access to recordings and revealed personal data is audited. No system is perfectly secure; if a breach affects your data, you and the Data Protection Board will be told as the DPDP Act requires.

## Your rights

Under the DPDP Act you can ask to access a summary of your personal data, to correct or complete it, to erase it, and to nominate someone to act for you, and you can raise a grievance. You can rename yourself under Settings; for anything else, email the contact below. For data in calls your organisation uploaded, the request may be passed to that organisation.

## Children

The service is for business use and is not meant for anyone under 18.

## Changes

This policy may be updated. The new version is posted here with its date.

## Contact and grievances

Jagadeesh Mandala, jagadeeshm0077@gmail.com, also for grievances. Each one is answered as soon as possible and within the time the DPDP rules set. If you are not satisfied with the answer, you may complain to the Data Protection Board of India.

_This text is a template prepared for an individual open-source project and has not been reviewed by a lawyer._
