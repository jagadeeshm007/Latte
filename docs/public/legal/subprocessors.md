---
title: Subprocessors
description: The services that process data for the hosted Latte service, what each does and where.
section: Legal
order: 4
---

# Subprocessors

Effective 23 October 2026.

The hosted service uses these providers. Each receives only what it needs for its part of the work.

| Provider | What it does | Data it handles | Where |
| --- | --- | --- | --- |
| [Supabase](https://supabase.com) | database, sign-in, invitation emails, file storage | all account, call and result data; recordings | Mumbai, India (`ap-south-1`) |
| [Vercel](https://vercel.com) | hosts the web app and runs the API; page-view analytics without cookies | requests as they pass through; page views | API in Mumbai, India (`bom1`); web pages from Vercel's global network |
| [Groq](https://groq.com) | speech-to-text for English, and the AI judge that scores calls | call audio and transcript text | may be outside India |
| [Sarvam AI](https://www.sarvam.ai) | speech-to-text and translation for Indian languages | call audio and transcript text of those calls | Sarvam's servers (Sarvam is an Indian company) |

An operator can switch the scoring model to [OpenRouter](https://openrouter.ai) or [Google Gemini](https://ai.google.dev) in its configuration; if that happens on the hosted service, this page will list them first.

Changes to this list are posted here with their date. Questions: jagadeeshm0077@gmail.com.
