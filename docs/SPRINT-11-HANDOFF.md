# Sprint 11 — Front CMS & Public School Website

## Status and scope

Delivered a frontend-only interactive CMS and public website preview, per the user's clarification.
No backend connection, persistence or production deployment was added. Sprint 12 was not started.
The implementation covers all nine primary views but does not claim every detail of the original
comprehensive acceptance list is complete; see gaps below.

## Routes / original submenu coverage

- Front CMS Overview
- Event
- Gallery
- News
- Media Manager
- Pages
- Menus
- Banner Images
- Public Website Preview

All seven original submenu labels remain unchanged. App integration adds a provider and lazy route
module; previous modules and the SchoolOS shell are preserved.

## Models and content lifecycle

`cmsModel.ts` defines content, blocks, assets, menus/items, settings, audit entries and validation.
`CMSContext.tsx` owns browser-memory state, scoped to the active school name, with synchronous
command reconciliation. Changing school names selects a separate simulated content scope; this
is not a production tenant identity model.

Content types share Draft, Review, Approved, Scheduled, Published, Unpublished and Archived states,
author, timestamps, version, visibility, session, category, SEO metadata and audit history. Saved
content retains previous versions. Review notes are required. An optional review-before-publishing
policy guards publication, and preview roles distinguish editing, reviewing and publishing UI.
These are not authenticated permissions.

Publication validates slug uniqueness, required content, page parents, media, alt text, links,
event dates and schedule timestamps. Editing a live record and saving Draft removes it from public
preview; there is no separate live/draft branch or atomic release system.

Scheduled records appear only when the adjustable simulation clock reaches their schedule.
There is no scheduler service. Initial comparison clock: 2025-02-24T12:00.

## Media architecture

Content references shared asset IDs. Usage is derived from covers, social/mobile images, album
references and block media. Published content requires active public assets and image alt text.
Archiving or restricting assets used by currently public content is blocked.

Media editing supports metadata, filename/type/size checks, alt text, captions, tags, visibility,
status, usage, replace/copy-reference simulation and upload success/failure simulations.
No uploaded file bytes are stored. The single seeded image is an AI-generated illustrative campus
downloaded into `public/images/school-campus.png`; it is not a photograph of the institution.

## Page builder / authoring

Pages and News support structured blocks, live text preview, adding/removing blocks, keyboard-
accessible move controls, enable/disable, title/text/media/link editing, templates and parent pages.
Block options include hero, text/image sections, columns, feature cards, feeds, CTA, contact, map,
testimonials and safe HTML placeholder. HTML is escaped text and never executed.

Gallery albums reference shared media with add/remove/reorder and cover selection. News and Events
can reference related galleries/events. Public events may reference Alumni Event IDs without
mutating, merging or publishing the original Alumni records.

## Menus and banners

Menus support primary/footer/utility/mobile placement, item labels, destinations, parent nesting,
visibility, new-tab metadata, ordering, preview and reset. Validation rejects duplicate destinations,
missing/unpublished destinations, cycles and more than three navigation levels.

Public navigation consumes published menu records. Missing/unpublished destination pages are
filtered out. External navigation is simulated, not opened.

Banners support shared desktop/mobile asset references, title/subtitle, alt text, CTA, ordering,
start/end dates, publication status and a static/manual-sequence presentation setting.

## Public preview / branding

A distinct school website experience includes an editorial campus hero, serif display typography,
school introduction, configurable homepage sections, news/event/gallery cards and detail views,
admissions CTA, contact fallback and footer. Public records are filtered centrally by school,
visibility, status, scheduling and expiry; private/draft/unpublished/archived content is excluded.
The preview has desktop/mobile modes and responsive navigation.

Shared App school name, logo, motto and inherited accent are reused. No second school identity
record was created. Shared contact/address data is not present in the current app, so the website
explicitly shows that it is unconfigured rather than inventing institutional contact details.

Homepage section enable/order, footer text, banner presentation, review policy, categories and
page templates are configurable in Website settings.

## Pulse / reporting

School Pulse includes record-backed published page/news, upcoming event, review/scheduled and
media-review counts with CMS navigation. Overview includes content KPIs, publishing/review desk,
SEO completeness and a report-summary simulation. No visitor, engagement or page-view figures
are fabricated.

## Verification

- `pnpm test:cms`: **43/43** checks (34 model/public-render checks + 9 SSR routes).
- Existing model/route suites: **196/196**:
  Credentials 40, Operations 20, Learning 18, Examination 23, Academic 29, Finance 39, Workforce 27.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed.
- `node tests/cms-browser-qa.mjs`: **88/88**, no runtime exceptions.
- Browser coverage includes draft save and isolation, public news listing/detail, mobile menu,
  builder live preview, media failure/retry/metadata save, and published footer menu consumption.
- Responsive coverage: every primary route at 390, 430, 768, 1024, 1280, 1440 and 1600px,
  plus public preview and page-builder drawer checks at all seven widths.
- The first browser run stopped on a test-sequencing error (mobile navigation action requested
  at desktop width); the script was corrected to enter mobile mode and the full rerun passed.
- Earlier browser regressions: **457/457**, all with successful final exits:
  Cross-module 49, Workforce/Communication 76, Examination 56, Learning/Library 78,
  Inventory/Transport 89, Certificates/Alumni 109.
- Combined browser total: **545** checks passed.

## Accessibility findings / limits

Reuses labelled fields, native button controls, table headers and focus-managed dialogs. Reordering
is available through buttons rather than drag-only interactions. Image alt text is validated.
Publication errors use alert roles. Public nested menus use native details/summary controls.
Custom HTML is never evaluated.

Browser responsive checks assert viewport containment, not complete accessibility. No full
screen-reader audit, contrast measurement, exhaustive keyboard-only interaction audit or formal
WCAG conformance certification was performed.

## Known limitations / remaining acceptance gaps

- Pulse and overview KPI links navigate to routes but do not carry every specific filter.
- Structured authoring is not a WYSIWYG rich-text editor: heading/bold/italic/list/link/quote options
  are represented by structured blocks, with limited distinct typography/rendering per block.
- Blocks have semantic presets, not a freeform layout engine. Some special block types render
  simple safe text rather than fully specialized widgets.
- Album/media registries lack full bulk selection/status workflows. Media and menu views do not
  implement all the common toolbar filters/pagination behaviors offered by the content registry.
- Media upload is a metadata simulation, not a native drop-zone/file-selection pipeline.
  Image bytes are available only for the seeded illustration. Replacement clears the stored
  preview URL; it does not upload replacement bytes.
- Mobile banner asset selection is stored but the website currently renders the desktop fallback.
- New-tab preference is metadata with an indicator; navigation remains inside the preview.
- Draft detail preview is text/block based rather than an exact website-layout preview.
- School address/contact/secondary color are not available as shared configuration inputs;
  these remain unconfigured rather than being maintained as separate CMS identity.
- The report action is a summary simulation, not a Reports module dataset or downloadable export.
- Review is a UI recommendation and not a complete server-enforced state machine; privileged
  transitions require production enforcement.
- No public enquiry, event registration, email delivery, analytics, domain, hosting, SEO indexing,
  persistent storage or actual scheduled publication exists.
- Responsive tests do not establish all edge cases, visual pixel fidelity or complete accessibility.

## Production dependencies / next recommendation

Before deployment: stable tenant IDs, database transactions, authenticated role enforcement,
draft/live revision separation, validated rich-text schema, media storage/transcoding/security,
moderation/consent, transactional publication, scheduled jobs, secure public routing, metadata/SEO,
cache invalidation, redirects, accessible image handling, backups and audit retention are required.

Do not automatically begin Sprint 12. First close the UI acceptance gaps above with school editorial
staff and complete keyboard/screen-reader QA. Then agree the Sprint 12 scope separately.
