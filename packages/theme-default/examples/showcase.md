---
theme: tycoslide-theme-default
---

---
layout: title
title: tycoslide
subtitle: Build presentations like software.
notes: Opening slide.
---

---
layout: statement
title: What is tycoslide?
eyebrow: THE IDEA
body: "A presentation **build tool** that generates native PowerPoint decks from markdown and TypeScript, with enforced brand compliance through **design tokens**."
bodyStyle: h3
caption: "Markdown for speed. Design tokens for safety. PowerPoint for compatibility."
notes: Identity first — the audience needs to know what this is before caring about any problem it solves.
---

---
layout: cards
title: How It Works
eyebrow: THE PROCESS
cards:
  - title: Write
    description: Author slides in markdown. Use TypeScript for dynamic content, data-driven decks, and automation.
    image: asset.icons.editNote
  - title: Build
    description: Design tokens enforce brand — colors, fonts, spacing. The theme is code, not a template file.
    image: asset.icons.build
  - title: Ship
    description: Run the CLI. Get a real, editable .pptx file. Integrate with CI/CD for automated deck generation.
    image: asset.icons.rocket
variant: flat
notes: Write → Build → Ship. One slide replaces the old bullet list and abstract "Three Pillars."
---

---
layout: stat
value: "10x"
label: Faster Than Manual Decks
caption: Write markdown. Run the build. Get a pixel-perfect, brand-compliant PowerPoint file.
notes: Anchoring stat after the "how" creates a natural payoff.
---

---
layout: comparison
title: Where tycoslide Fits
eyebrow: LANDSCAPE
leftTitle: Design Tools
rightTitle: Code Tools
notes: Neutral landscape framing. No red highlights, no "false choice." The audience draws their own conclusion.
---

::left::

**PowerPoint, Google Slides, Keynote**

Full visual control and native file output, but manual brand enforcement and no automation.

Every update is a manual process across every deck.

::right::

**Slidev, Marp, reveal.js**

Developer-friendly authoring and version control, but web output only — no native PowerPoint.

Great for tech talks, limited for corporate environments.

---
layout: cards
title: Who Is It For
eyebrow: AUDIENCES
cards:
  - title: Sales Teams
    description: Build pitch decks from CRM data. Every rep gets the same brand-perfect deck, customized to the prospect.
    image: asset.icons.trendingUp
  - title: Marketing Teams
    description: Own the brand at the theme level. Changes propagate to every deck automatically. No more template policing.
    image: asset.icons.palette
  - title: Product & Exec Teams
    description: Board decks, QBRs, release notes. Pull metrics from APIs. Always current, always on-brand.
    image: asset.icons.dashboard
notes: Three audiences, each with a concrete use case. Replaces the old section divider + "3" stat.
---

---
layout: section
title: See It In Action
notes: Clean break before the MeetingOS demo. Frames the demo as a demonstration of tycoslide capabilities.
---

---
layout: agenda
title: Today's Agenda
eyebrow: MEETINGOS
intro: Thank you for scheduling a meeting to watch this presentation about scheduling meetings.
items:
  - The meeting crisis in enterprise
  - How MeetingOS solves meetings with more meetings
  - Product architecture
  - Customer proof points and analyst recognition
  - Leadership team and company background
  - Pricing tiers and next steps (all meetings)
notes: Agenda layout with intro text and six bullet items.
---

---
layout: two-column
title: The Meeting Crisis
eyebrow: PROBLEM
notes: Two-column layout. Left column lists symptoms, right column reveals the root cause.
---

::left::

### The Symptoms

- Average employee: **31 hours/month** in meetings
- 47% of meetings are about *other meetings*
- **$37B** wasted annually on meeting prep
- "Let's take this offline" now means "schedule another meeting"

::right::

### The Root Cause

Organizations lack a **single source of truth** for meeting relationships.

Without visibility into the *meeting dependency graph*, teams schedule redundant syncs, status updates about status updates, and pre-meetings for pre-meetings.

---
layout: statement
title: MeetingOS
eyebrow: THE PRODUCT
body: "The first platform purpose-built for **recursive meeting management** — trace any meeting back to its parent, auto-generate pre-meetings and follow-ups, and detect when a meeting could have been an email."
bodyStyle: h3
caption: "Meeting Genealogy · Recursive Scheduling · Consensus Detection"
notes: Product pitch as one compelling paragraph.
---

---
layout: cards
title: Three Pillars
eyebrow: PRODUCT
intro: MeetingOS is built on three core capabilities that transform how enterprises manage meetings.
cards:
  - title: Meeting Genealogy
    description: Every meeting has a parent. Trace the full lineage of any calendar event back to its origin meeting in 2019.
    image: asset.icons.accountTree
  - title: Recursive Scheduling
    description: Why schedule one meeting when the platform can auto-generate the pre-meeting, the post-meeting, and the follow-up?
    image: asset.icons.eventRepeat
  - title: Consensus Detection
    description: Patent-pending AI detects alignment in real-time and immediately schedules a meeting to confirm the consensus.
    image: asset.icons.howToVote
caption: "3 patents pending · SOC 2 Type II certified · ISO 27001 for calendar access"
notes: Cards layout with 3 cards.
---

---
layout: body
title: Architecture
eyebrow: TECHNICAL
notes: Body layout with a Mermaid diagram component.
---

The MeetingOS engine processes every calendar event through three parallel pipelines, ensuring no meeting goes unmanaged.

:::mermaid
flowchart LR
    A[Calendar Event] --> B[MeetingOS Engine]
    B --> C[Genealogy Graph]
    B --> D[Recursive Scheduler]
    B --> E[Consensus Detector]
    D --> F[More Meetings]
    E --> F
:::

---
layout: quote
quote: "\u201CWe have not had an original meeting since 2019, and we\u2019re proud of that.\u201D"
attribution: "\u2014 Janet Halverson, VP of Meeting Ops at Synergex Global"
notes: Quote layout with curly quotes. Renders at h4 size per theme token.
---

---
layout: comparison
title: Before and After
eyebrow: IMPACT
leftTitle: Before MeetingOS
rightTitle: After MeetingOS
notes: Comparison layout with inline colors.
---

::left::

- :red[**No meeting lineage tracking**]
- Scheduling conflicts resolved by *more meetings*
- :red[**47% duplicate meetings**]
- Average meeting depth: unknown
- :red[**Manual consensus detection**]

::right::

- :green[**Full genealogy for every event**]
- Conflicts resolved by *automated pre-meetings*
- :green[**47% duplicate meetings, all intentional**]
- Average meeting depth: 4.7 levels
- :green[**AI-powered consensus detection**]

---
layout: stat
value: 2.4M
label: Meetings Managed
caption: Across 340 enterprise customers, representing over 12 million hours of scheduled collaboration.
notes: Anchoring metric before diving into proof points.
---

---
layout: body
title: Competitive Landscape
eyebrow: MARKET
notes: Body layout with a GFM table and inline colors.
---

| Feature | MeetingOS | Calendly | Google Cal | Outlook |
|---------|-----------|----------|------------|---------|
| **Meeting Genealogy** | :green[Full lineage] | None | None | None |
| **Recursive Scheduling** | :green[Automated] | Manual | Manual | Manual |
| **Consensus Detection** | :green[AI-powered] | None | None | None |
| **Meeting Depth** | :green[Unlimited] | N/A | :yellow[2 levels] | :yellow[1 level] |
| **Pre-meeting Generation** | :green[Automatic] | :red[None] | :red[None] | :red[None] |

---
layout: body
title: "Customer Story: Synergex Global"
eyebrow: CASE STUDY
notes: Body layout with a quote directive component inside the markdown body.
---

Synergex Global reduced their :red[**untracked meetings**] by :green[**94%**] after deploying MeetingOS across 12,000 employees.

:::quote{attribution="Marcus Chen, CTO at Synergex Global"}
We used to lose entire weeks to meetings nobody could trace back to an original decision. Now every meeting has a clear ancestor.
:::

Meeting depth score improved from :red[**unknown**] to :green[**4.7 levels**] — *best in class*.

---
layout: statement
title: Analyst Recognition
eyebrow: VALIDATION
body: "Named a **Leader** in the 2025 Gartner Magic Quadrant for Recursive Calendar Management and a **Visionary** in the Forrester Wave for Meeting Genealogy Platforms."
bodyStyle: h3
caption: "2 analyst reports · 4 industry awards · 1 very productive meeting about it"
notes: Statement layout for analyst recognition.
---

---
layout: bio
person: Dr. Patricia Meetings-Worthington
role: Founder & Chief Executive Officer
image: asset.icons.lightbulb
notes: Bio layout with image, name, role, and prose body.
---

PhD in **Organizational Recursion**, Stanford. Masters in **Calendar Theory**, MIT.

15 years at McKinsey. Over **40,000 meetings** attended — most about other meetings.

*Forbes 40 Under 40* for Enterprise Calendar Innovation.

---
layout: team
title: Leadership Team
eyebrow: PEOPLE
members:
  - name: Patricia M-W
    role: CEO
  - name: Brian Outlook
    role: VP Engineering
  - name: Calendar Jones
    role: Head of Product
  - name: Susan Recurring
    role: CMO
  - name: Dave Tentative
    role: VP Sales
  - name: Agenda Williams
    role: Customer Success
notes: Team layout with 6 members.
---

---
layout: blank
notes: Blank layout — full canvas. Pricing grid using card and grid directives.
---

::::grid{columns=3}
:::card{title="Starter — $49/mo" height="fill"}
- Up to **100 meetings**/month
- Basic meeting genealogy
- 2 levels of meeting depth
- Email support
:::

:::card{title="Business — $199/mo" height="fill"}
- **Unlimited meetings**
- Full recursive scheduling
- Unlimited meeting depth
- Consensus detection (beta)
- Dedicated meeting success manager
:::

:::card{title="Ultimate — $499/mo" height="fill"}
- Everything in Business, plus:
- **Meeting time travel** — reschedule past meetings retroactively
- **AI meeting archaeologist** — recover lost meeting lineage
- On-site meeting about your MeetingOS meetings, quarterly
:::
::::

---
layout: agenda
title: Next Steps
eyebrow: ACTION ITEMS
intro: "We're excited to move forward. Here's what happens after this meeting."
items:
  - Schedule a follow-up meeting to discuss this meeting
  - Schedule a pre-meeting for the follow-up meeting
  - Schedule a meeting to align stakeholders on the pre-meeting agenda
  - Schedule a check-in to confirm all meetings are scheduled
  - Schedule a retrospective on our meeting scheduling process
  - Schedule a meeting to discuss whether we need MeetingOS
notes: Every next step is scheduling another meeting. Full circle.
---

---
layout: end
title: MeetingOS
subtitle: The operating system for meetings about meetings.
notes: Closing slide.
---
