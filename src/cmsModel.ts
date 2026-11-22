export const cmsPages = [
  "Front CMS Overview",
  "Event",
  "Gallery",
  "News",
  "Media Manager",
  "Pages",
  "Menus",
  "Banner Images",
  "Public Website Preview",
];
export type ContentKind = "Event" | "Gallery" | "News" | "Pages" | "Banner Images";
export type Status =
  | "Draft"
  | "Review"
  | "Approved"
  | "Scheduled"
  | "Published"
  | "Unpublished"
  | "Archived";
export const statuses: Status[] = [
  "Draft",
  "Review",
  "Approved",
  "Scheduled",
  "Published",
  "Unpublished",
  "Archived",
];
export const blockTypes = [
  "Hero",
  "Text section",
  "Image section",
  "Image with text",
  "Two-column content",
  "Statistics",
  "Feature cards",
  "Gallery",
  "News feed",
  "Events feed",
  "Call-to-action",
  "Contact information",
  "Map placeholder",
  "Testimonials",
  "Custom HTML placeholder",
  "Heading",
  "Paragraph",
  "Bold",
  "Italic",
  "List",
  "Link",
  "Quote",
  "Separator",
];
export type Block = {
  id: string;
  type: string;
  title: string;
  text: string;
  media: string;
  destination: string;
  enabled: boolean;
};
export type Audit = { at: string; actor: string; action: string };
export type Content = {
  id: string;
  school: string;
  kind: ContentKind;
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  session: string;
  author: string;
  status: Status;
  visibility: string;
  featured: boolean;
  image: string;
  socialImage: string;
  media: string[];
  blocks: Block[];
  parent: string;
  order: number;
  template: string;
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  venue: string;
  organizer: string;
  audience: string;
  registration: string;
  deadline: string;
  contact: string;
  relatedEvent: string;
  relatedGallery: string;
  alumniEvent: string;
  seoTitle: string;
  seoDescription: string;
  tags: string;
  schedule: string;
  expires: string;
  ctaLabel: string;
  destination: string;
  mobileImage: string;
  alt: string;
  created: string;
  updated: string;
  published: string;
  version: number;
  history: Audit[];
};
export type Asset = {
  id: string;
  school: string;
  filename: string;
  type: string;
  size: number;
  title: string;
  description: string;
  alt: string;
  category: string;
  tags: string;
  visibility: string;
  status: string;
  url: string;
  created: string;
  actor: string;
  history: Audit[];
};
export type MenuItem = {
  id: string;
  label: string;
  type: string;
  destination: string;
  parent: string;
  visible: boolean;
  newTab: boolean;
};
export type Menu = {
  id: string;
  school: string;
  name: string;
  placement: string;
  status: string;
  items: MenuItem[];
  history: Audit[];
};
export type SiteSettings = {
  sections: string[];
  bannerStyle: string;
  footer: string;
  seo: string;
  reviewRequired: boolean;
  categories: string[];
  templates: string[];
};
export type CMSState = { content: Content[]; assets: Asset[]; menus: Menu[]; versions: Content[] };
export const uid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;
export const dateValid = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
export const safeURL = (v: string) => /^https:\/\/[^\s]+$/i.test(v);
export const slugValid = (v: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
export function isPublic(c: Content, school: string, now: string) {
  return (
    c.school === school &&
    c.visibility === "Public" &&
    (c.status === "Published" || (c.status === "Scheduled" && !!c.schedule && c.schedule <= now)) &&
    (!c.expires || c.expires >= now.slice(0, 10))
  );
}
export function publicAsset(id: string, assets: Asset[], school: string) {
  return assets.find(
    (a) => a.id === id && a.school === school && a.status === "Active" && a.visibility === "Public",
  );
}
export function newContent(
  kind: ContentKind,
  school: string,
  session: string,
  author: string,
): Content {
  const now = new Date().toISOString();
  return {
    id: uid("CMS"),
    school,
    kind,
    title: "",
    slug: "",
    summary: "",
    body: "",
    category: "School Life",
    session,
    author,
    status: "Draft",
    visibility: "Public",
    featured: false,
    image: "",
    socialImage: "",
    media: [],
    blocks: [],
    parent: "",
    order: 0,
    template: "Editorial",
    start: "",
    end: "",
    startTime: "09:00",
    endTime: "10:00",
    venue: "",
    organizer: author,
    audience: "School community",
    registration: "Not collected",
    deadline: "",
    contact: "",
    relatedEvent: "",
    relatedGallery: "",
    alumniEvent: "",
    seoTitle: "",
    seoDescription: "",
    tags: "",
    schedule: "",
    expires: "",
    ctaLabel: "Learn more",
    destination: "",
    mobileImage: "",
    alt: "",
    created: now,
    updated: now,
    published: "",
    version: 0,
    history: [],
  };
}
export function contentError(c: Content, state: CMSState, now: string) {
  if (!c.title.trim()) return "A content title is required.";
  if (!slugValid(c.slug)) return "Use a lowercase slug with words separated by single hyphens.";
  if (state.content.some((v) => v.id !== c.id && v.school === c.school && v.slug === c.slug))
    return "This public path already exists. Choose a unique slug.";
  if (!Number.isSafeInteger(c.order) || c.order < 0)
    return "Display order must be a non-negative whole number.";
  if (c.parent) {
    let parent = c.parent;
    const visited = new Set([c.id]);
    while (parent) {
      if (visited.has(parent)) return "Circular parent page relationship.";
      visited.add(parent);
      const p = state.content.find(
        (v) => v.id === parent && v.kind === "Pages" && v.school === c.school,
      );
      if (!p) return "Parent page is unavailable.";
      parent = p.parent;
    }
  }
  const publishing = ["Published", "Scheduled"].includes(c.status);
  if (
    c.status === "Scheduled" &&
    (!c.schedule || Number.isNaN(Date.parse(c.schedule)) || c.schedule <= now)
  )
    return "Schedule a valid future publication timestamp.";
  if (c.kind === "Event") {
    if (
      (c.start && !dateValid(c.start)) ||
      (c.end && !dateValid(c.end)) ||
      (c.start && c.end && c.end < c.start)
    )
      return "Event end date must be on or after a valid start date.";
    if (c.start === c.end && c.startTime >= c.endTime)
      return "Event end time must follow start time.";
    if (c.deadline && (!dateValid(c.deadline) || c.deadline > c.start))
      return "Registration deadline must be on or before the event.";
  }
  if (
    c.kind === "Banner Images" &&
    ((c.start && !dateValid(c.start)) ||
      (c.expires && !dateValid(c.expires)) ||
      (c.start && c.expires && c.expires < c.start))
  )
    return "Banner dates are invalid or reversed.";
  if (publishing) {
    if (!c.summary.trim() || !c.seoTitle.trim() || !c.seoDescription.trim())
      return "Before publishing, add a summary, SEO title and SEO description.";
    if (
      c.kind === "Event" &&
      (!dateValid(c.start) || !dateValid(c.end) || !c.venue.trim() || !c.organizer.trim())
    )
      return "Published events need dates, venue and organizer.";
    if (c.kind === "News" && !c.body.trim() && !c.blocks.length)
      return "Add article text or content blocks.";
    if (c.kind === "Pages" && (!c.template || !c.blocks.length))
      return "Choose a page template and add at least one content block.";
    if (
      c.blocks.some(
        (b) =>
          b.enabled &&
          ![
            "Separator",
            "News feed",
            "Events feed",
            "Gallery",
            "Contact information",
            "Map placeholder",
          ].includes(b.type) &&
          !b.title.trim() &&
          !b.text.trim(),
      )
    )
      return "An enabled content block is empty. Add content or disable it.";
    if (c.kind === "Gallery" && !c.media.length)
      return "An album needs shared media before publishing.";
    if (["Gallery", "Banner Images"].includes(c.kind) && !c.image)
      return "Select a cover / banner image before publishing.";
    if (c.kind === "Banner Images" && (!c.alt.trim() || !c.ctaLabel.trim() || !c.destination))
      return "Banner alt text, call-to-action label and destination are required.";
    const ids = [
      c.image,
      c.socialImage,
      c.mobileImage,
      ...c.media,
      ...c.blocks.map((b) => b.media),
    ].filter(Boolean);
    if (ids.some((id) => !publicAsset(id, state.assets, c.school)))
      return "Published content must reference active, public media. Review missing/private/archived assets.";
    if (
      ids.some((id) => {
        const a = state.assets.find((a) => a.id === id);
        return a?.type === "Image" && !a.alt.trim();
      })
    )
      return "Image alternative text is required before publishing.";
    if (c.destination && !destinationValid(c.destination, state, c.school))
      return "The call-to-action destination is invalid or unpublished.";
    if (c.blocks.some((b) => b.destination && !destinationValid(b.destination, state, c.school)))
      return "A block link points to an invalid or unpublished destination.";
  }
  return "";
}
export function destinationValid(dest: string, state: CMSState, school: string) {
  return (
    ["home", "news", "events", "gallery", "contact"].includes(dest) ||
    safeURL(dest) ||
    state.content.some(
      (c) =>
        c.id === dest &&
        c.school === school &&
        c.status === "Published" &&
        c.visibility === "Public",
    )
  );
}
export function menuError(menu: Menu, state: CMSState) {
  if (!menu.name.trim()) return "Name the menu.";
  const paths = new Set<string>();
  for (const item of menu.items) {
    if (!item.label.trim()) return "Every menu item needs a label.";
    if (!destinationValid(item.destination, state, menu.school))
      return "A menu destination is missing, unpublished or invalid.";
    if (paths.has(item.destination)) return "Duplicate destination in this menu.";
    paths.add(item.destination);
    let parent = item.parent;
    let depth = 0;
    const seen = new Set([item.id]);
    while (parent) {
      if (seen.has(parent)) return "Circular menu hierarchy.";
      seen.add(parent);
      const p = menu.items.find((i) => i.id === parent);
      if (!p) return "Menu parent not found.";
      parent = p.parent;
      if (++depth > 2) return "Use at most three navigation levels.";
    }
  }
  return "";
}
export function assetError(a: Asset, assets: Asset[]) {
  if (!a.filename.trim() || !a.title.trim()) return "Filename and title are required.";
  if (!/\.(png|jpe?g|webp|svg|pdf|mp4|mp3|pptx?|docx?)$/i.test(a.filename))
    return "Unsupported file extension. Use an image, PDF, media or office document.";
  if (!Number.isFinite(a.size) || a.size <= 0 || a.size > 25 * 1024 * 1024)
    return "File size must be between 1 byte and 25 MB.";
  if (
    assets.some(
      (v) =>
        v.school === a.school &&
        v.id !== a.id &&
        v.filename.toLowerCase() === a.filename.toLowerCase(),
    )
  )
    return "This filename already exists. Edit or replace the existing asset.";
  if (a.type === "Image" && !a.alt.trim())
    return "Provide meaningful alternative text for the image.";
  return "";
}
export const assetUsage = (id: string, content: Content[]) =>
  content.filter((c) =>
    [c.image, c.socialImage, c.mobileImage, ...c.media, ...c.blocks.map((b) => b.media)].includes(
      id,
    ),
  );
export function seedCMS(school: string, session: string): CMSState {
  const asset: Asset = {
    id: "MEDIA-CAMPUS",
    school,
    filename: "school-campus.png",
    type: "Image",
    size: 1910000,
    title: "A place to grow",
    description: "AI-generated illustrative campus, not a photograph of this institution.",
    alt: "Illustrative school courtyard with stone buildings, trees and a green lawn",
    category: "Facilities",
    tags: "campus, illustrative",
    visibility: "Public",
    status: "Active",
    url: "/images/school-campus.png",
    created: "2025-02-24T09:00:00.000Z",
    actor: "Illustrative seed",
    history: [],
  };
  const make = (kind: ContentKind, id: string, title: string, slug: string): Content => ({
    ...newContent(kind, school, session, "Illustrative editorial team"),
    id,
    title,
    slug,
    summary: "Illustrative website content. Replace with your school's reviewed information.",
    seoTitle: title,
    seoDescription: "Illustrative school website preview content.",
    status: "Published",
    image: asset.id,
    version: 1,
    published: "2025-02-24T09:00:00.000Z",
  });
  const home = {
    ...make("Pages", "PAGE-HOME", "A world of possibility begins here.", "home"),
    blocks: [
      {
        id: "B1",
        type: "Text section",
        title: "Rooted in care. Inspired by possibility.",
        text: "We believe a school should be a place where curiosity feels at home. Discover an illustrative vision of learning, belonging and becoming.",
        media: "",
        destination: "",
        enabled: true,
      },
      {
        id: "B2",
        type: "Feature cards",
        title: "More than a classroom.",
        text: "Thoughtful learning | Creative exploration | A connected community",
        media: "",
        destination: "",
        enabled: true,
      },
      {
        id: "B3",
        type: "News feed",
        title: "Life at our school",
        text: "",
        media: "",
        destination: "",
        enabled: true,
      },
      {
        id: "B4",
        type: "Events feed",
        title: "What's ahead",
        text: "",
        media: "",
        destination: "",
        enabled: true,
      },
      {
        id: "B5",
        type: "Gallery",
        title: "Room to explore",
        text: "",
        media: "",
        destination: "",
        enabled: true,
      },
      {
        id: "B6",
        type: "Call-to-action",
        title: "Your next chapter starts with a conversation.",
        text: "Learn about admissions and discover whether our school is right for your family.",
        media: "",
        destination: "contact",
        enabled: true,
      },
    ],
  };
  const about = {
    ...make("Pages", "PAGE-ABOUT", "A school for the whole person", "about"),
    blocks: [
      {
        id: "AB1",
        type: "Text section",
        title: "Knowledge. Character. Possibility.",
        text: "This is illustrative school content, ready for your story. Use the page builder to share your mission, values and principal's message.",
        media: asset.id,
        destination: "",
        enabled: true,
      },
    ],
  };
  const news = {
    ...make("News", "NEWS-1", "Small questions. Extraordinary discoveries.", "curiosity-in-action"),
    body: "Illustrative editorial story: a celebration of curiosity and hands-on learning. Replace this example with an approved school story before any production publication.",
    category: "Academic News",
  };
  const event = {
    ...make("Event", "EVENT-1", "Discover our school", "school-discovery-day"),
    start: "2025-03-15",
    end: "2025-03-15",
    venue: "School campus · illustrative",
    organizer: "Admissions office",
    body: "An illustrative opportunity to explore school life. No real registration is collected.",
    category: "Community",
  };
  const album = {
    ...make("Gallery", "GALLERY-1", "Spaces that inspire", "spaces-that-inspire"),
    media: [asset.id],
    category: "Facilities",
  };
  const banner = {
    ...make("Banner Images", "BANNER-1", "A world of possibility begins here.", "welcome-banner"),
    body: "A place to be yourself. A community to become your best.",
    alt: asset.alt,
    ctaLabel: "Discover our school",
    destination: "PAGE-ABOUT",
    start: "2025-01-01",
  };
  const menu: Menu = {
    id: "MENU-PRIMARY",
    school,
    name: "Primary navigation",
    placement: "Primary",
    status: "Published",
    items: [
      {
        id: "MI1",
        label: "Our school",
        type: "CMS page",
        destination: "PAGE-ABOUT",
        parent: "",
        visible: true,
        newTab: false,
      },
      {
        id: "MI2",
        label: "News & stories",
        type: "News category",
        destination: "news",
        parent: "",
        visible: true,
        newTab: false,
      },
      {
        id: "MI3",
        label: "What's on",
        type: "Event listing",
        destination: "events",
        parent: "",
        visible: true,
        newTab: false,
      },
      {
        id: "MI4",
        label: "Gallery",
        type: "Gallery",
        destination: "gallery",
        parent: "",
        visible: true,
        newTab: false,
      },
    ],
    history: [],
  };
  return {
    content: [home, about, news, event, album, banner],
    assets: [asset],
    menus: [menu],
    versions: [],
  };
}
