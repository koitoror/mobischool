import { useState, useRef, useEffect } from "react";
import { useCMS } from "./CMSContext";
import { Button } from "./components/OperationsUI";
import Icon from "./components/Icon";
import { isPublic, publicAsset, type Content, type Block, type MenuItem } from "./cmsModel";
export default function PublicWebsite({
  start = "home",
  editorial = false,
}: {
  start?: string;
  editorial?: boolean;
}) {
  const x = useCMS(),
    [path, setPath] = useState(start),
    [mobile, setMobile] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [bannerIndex, setBannerIndex] = useState(0);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setMenuOpen(false);
      header.current?.querySelector<HTMLButtonElement>(".web-menu-toggle button")?.focus();
    };
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener("keydown", escape);
    document.addEventListener("click", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("click", outside);
    };
  }, [menuOpen]);
  const content = x.content.filter((c) => isPublic(c, x.school, x.now));
  const navigate = (dest: string) => {
    if (dest.startsWith("https://")) {
      setPath("external:" + dest);
    } else setPath(dest);
    setMenuOpen(false);
  };
  const image = (id: string, alt = "") => {
    const asset = publicAsset(id, x.assets, x.school);
    return asset?.url ? (
      <img src={asset.url} alt={alt || asset.alt} />
    ) : (
      <div className="web-image-placeholder">
        <Icon name="image" size={28} />
        <span>{asset ? "File metadata only · no stored image" : "Image not configured"}</span>
      </div>
    );
  };
  const menus = x.menus.filter((m) => m.status === "Published" && m.school === x.school);
  const allowed = (i: MenuItem) =>
    i.visible &&
    (["home", "news", "events", "gallery", "contact"].includes(i.destination) ||
      i.destination.startsWith("https://") ||
      content.some((c) => c.id === i.destination));
  const navItems = (items: MenuItem[], parent = "") =>
    items
      .filter((i) => i.parent === parent && allowed(i))
      .map((i) => (
        <div key={i.id} className="web-nav-item">
          <Button onClick={() => navigate(i.destination)}>
            {i.label}
            {i.newTab ? " ↗" : ""}
          </Button>
          {items.some((child) => child.parent === i.id && allowed(child)) && (
            <details>
              <summary aria-label={`Open ${i.label} submenu`}>More</summary>
              <div className="web-submenu">{navItems(items, i.id)}</div>
            </details>
          )}
        </div>
      ));
  const cards = (kind: string) =>
    content
      .filter((c) => c.kind === kind && (kind !== "Event" || c.end >= x.now.slice(0, 10)))
      .sort((a, b) => a.order - b.order);
  const listing = (kind: string) => (
    <div className="web-cards">
      {cards(kind).map((c) => (
        <article className="web-story" key={c.id}>
          {image(c.image)}
          <div className="web-story-body">
            <small>
              {c.category} {c.kind === "Event" && ` · ${c.start}`}
            </small>
            <div className="web-card-title">{c.title}</div>
            <p>{c.summary}</p>
            <Button onClick={() => navigate(c.id)}>
              {kind === "Gallery"
                ? "Explore album"
                : kind === "Event"
                  ? "Event details"
                  : "Read story"}{" "}
              <Icon name="arrow" size={14} />
            </Button>
          </div>
        </article>
      ))}
      {!cards(kind).length && (
        <p>No published {kind.toLowerCase()} content yet. Please check back.</p>
      )}
    </div>
  );
  const block = (b: Block) =>
    !b.enabled ? null : (
      <section
        className={`web-section web-block-${b.type.toLowerCase().replace(/ /g, "-")}`}
        key={b.id}
      >
        <div className="web-section-label">
          {b.type === "Custom HTML placeholder"
            ? "Safe text preview · HTML never executed"
            : b.type}
        </div>
        <div className="web-section-title" role="heading" aria-level={2}>
          {b.title}
        </div>
        {b.media && image(b.media)}
        {b.type === "News feed" ? (
          listing("News")
        ) : b.type === "Events feed" ? (
          listing("Event")
        ) : b.type === "Gallery" ? (
          listing("Gallery")
        ) : b.type === "Feature cards" || b.type === "Two-column content" ? (
          <div className="web-features">
            {b.text.split("|").map((text, i) => (
              <div key={i}>
                <span>0{i + 1}</span>
                <strong>{text.trim()}</strong>
              </div>
            ))}
          </div>
        ) : b.type === "Separator" ? (
          <hr />
        ) : (
          <p className={b.type === "Quote" ? "web-quote" : ""}>{b.text}</p>
        )}
        {b.destination && (
          <Button onClick={() => navigate(b.destination)}>
            Explore more <Icon name="arrow" size={14} />
          </Button>
        )}
      </section>
    );
  const page = content.find((c) => c.id === path || c.slug === path),
    home = content.find((c) => c.kind === "Pages" && c.slug === "home");
  const banners = content
    .filter((c) => c.kind === "Banner Images" && (!c.start || c.start <= x.now.slice(0, 10)))
    .sort((a, b) => a.order - b.order);
  const banner = banners[bannerIndex % banners.length];
  return (
    <div className="website-wrap">
      <div className="web-preview-toolbar">
        <span>
          <i /> PUBLIC WEBSITE PREVIEW · NOT DEPLOYED
          {editorial ? " · editorial record preview" : ""}
        </span>
        <div>
          <Button onClick={() => setMobile(false)}>Desktop</Button>
          <Button onClick={() => setMobile(true)}>Mobile</Button>
          <Button onClick={() => navigate("home")}>Reset preview</Button>
        </div>
      </div>
      <div className={`website ${mobile ? "web-mobile" : ""}`}>
        <div className="web-utility">
          <span>{x.identity.motto}</span>
          <span>Illustrative content · no real registrations</span>
        </div>
        <header className="web-header" ref={header}>
          <div className="web-brand" onClick={() => navigate("home")} role="presentation">
            {x.identity.logo ? (
              <img src={x.identity.logo} alt={`${x.school} logo`} />
            ) : (
              <span className="web-crest">
                <Icon name="book" size={27} />
              </span>
            )}
            <strong>
              {x.school}
              <small>LEARN. BELONG. BECOME.</small>
            </strong>
          </div>
          <div className="web-menu-toggle">
            <Button onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? "Close navigation" : "Open navigation"}
            </Button>
          </div>
          <nav
            aria-label="Public website navigation"
            className={menuOpen ? "web-nav open" : "web-nav"}
          >
            {menus
              .filter((m) => m.placement === "Primary" || m.placement === "Mobile")
              .map((m) => (
                <div className="web-nav-group" key={m.id}>
                  {navItems(m.items)}
                </div>
              ))}
            <Button onClick={() => navigate("contact")}>
              Enquire about admissions <Icon name="arrow" size={14} />
            </Button>
          </nav>
        </header>
        {path === "home" ? (
          <>
            <section className="web-hero">
              {banner && image(banner.image, banner.alt)}
              <div className="web-hero-shade" />
              <div className="web-hero-copy">
                <span>WELCOME TO {x.school.toUpperCase()}</span>
                <div role="heading" aria-level={1}>
                  {banner?.title || "A place to learn. A place to belong."}
                </div>
                <p>
                  {banner?.body ||
                    "Discover our school community. Our website content is being prepared."}
                </p>
                <Button onClick={() => navigate(banner?.destination || "contact")}>
                  {banner?.ctaLabel || "Contact the school"} <Icon name="arrow" size={16} />
                </Button>
                <small>Illustrative campus image · not an institutional photograph</small>
              </div>
              <div className="web-hero-footer">
                <span>CURIOUS MINDS. OPEN POSSIBILITIES.</span>
                {x.settings.bannerStyle === "Manual sequence" && banners.length > 1 && (
                  <>
                    <Button onClick={() => setBannerIndex(bannerIndex + 1)}>Next banner</Button>
                    <span>
                      {(bannerIndex % banners.length) + 1} / {banners.length}
                    </span>
                  </>
                )}
              </div>
            </section>
            {x.settings.sections.map((section) =>
              section === "Introduction" ? (
                <section className="web-intro" key={section}>
                  <span className="web-section-label">THE {x.school.toUpperCase()} EXPERIENCE</span>
                  <div className="web-section-title">
                    A strong foundation.
                    <br />
                    <em>A limitless outlook.</em>
                  </div>
                  <p>{home?.summary || "School information is being prepared."}</p>
                  <Button
                    onClick={() =>
                      navigate(content.find((c) => c.slug === "about")?.id || "contact")
                    }
                  >
                    Get to know us <Icon name="arrow" size={15} />
                  </Button>
                </section>
              ) : section === "Pages" ? (
                <div key={section}>
                  {home?.blocks
                    .filter(
                      (b) =>
                        !["News feed", "Events feed", "Gallery", "Call-to-action"].includes(b.type),
                    )
                    .map(block)}
                </div>
              ) : section === "News" ? (
                <section className="web-section" key={section}>
                  <div className="web-section-label">STORIES FROM OUR COMMUNITY</div>
                  <div className="web-section-title">A school full of stories.</div>
                  {listing("News")}
                </section>
              ) : section === "Events" ? (
                <section className="web-section web-tinted" key={section}>
                  <div className="web-section-label">DATES FOR YOUR DIARY</div>
                  <div className="web-section-title">Come be part of it.</div>
                  {listing("Event")}
                </section>
              ) : section === "Gallery" ? (
                <section className="web-section" key={section}>
                  <div className="web-section-label">A CLOSER LOOK</div>
                  <div className="web-section-title">Spaces. Moments. Possibilities.</div>
                  {listing("Gallery")}
                </section>
              ) : section === "Admissions" ? (
                <section className="web-admissions" key={section}>
                  <span>YOUR NEXT CHAPTER</span>
                  <div className="web-section-title">
                    Every possibility starts
                    <br />
                    with a first conversation.
                  </div>
                  <Button onClick={() => navigate("contact")}>
                    Connect with our school <Icon name="arrow" size={15} />
                  </Button>
                </section>
              ) : (
                <section className="web-section" key={section}>
                  <div className="web-section-title">Let’s start a conversation.</div>
                  <p>
                    Contact information has not been configured in shared school identity. Please
                    contact the school office through your existing channel. This preview does not
                    collect enquiries.
                  </p>
                </section>
              ),
            )}
          </>
        ) : page ? (
          <>
            <div className="web-page-intro">
              <small>
                {page.kind} · {page.category}
              </small>
              <div role="heading" aria-level={1} className="web-section-title">
                {page.title}
              </div>
              <p>{page.summary}</p>
            </div>
            {page.image && <div className="web-detail-image">{image(page.image)}</div>}
            <div className="web-detail-body">
              {page.body && <p>{page.body}</p>}
              {page.kind === "Event" && (
                <p>
                  {page.start} – {page.end} · {page.startTime} – {page.endTime}
                  <br />
                  {page.venue} · {page.organizer}
                  <br />
                  No real event registration collected.
                </p>
              )}
              {page.blocks.map(block)}
              {page.kind === "Gallery" && (
                <div className="web-cards">
                  {page.media.map((id) => (
                    <figure key={id}>
                      {image(id)}
                      <figcaption>{publicAsset(id, x.assets, x.school)?.description}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : ["news", "events", "gallery"].includes(path) ? (
          <section className="web-section">
            <div role="heading" aria-level={1} className="web-section-title">
              {path === "news" ? "News & stories" : path === "events" ? "What’s on" : "Our gallery"}
            </div>
            {listing(path === "news" ? "News" : path === "events" ? "Event" : "Gallery")}
          </section>
        ) : (
          <section className="web-section">
            <div className="web-section-title">
              {path === "contact"
                ? "We’d love to hear from you."
                : path.startsWith("external:")
                  ? "External destination preview"
                  : "Page not available"}
            </div>
            <p>
              {path.startsWith("external:")
                ? `External link simulation: ${path.slice(9)}. No external site was opened.`
                : path === "contact"
                  ? "School contact details are not configured. No contact form data is collected by this prototype."
                  : "This content may be unpublished, private or no longer available."}
            </p>
            <Button onClick={() => navigate("home")}>Return home</Button>
          </section>
        )}
        <footer className="web-footer">
          <div>
            <strong>{x.school}</strong>
            <p>{x.identity.motto}</p>
            <small>{x.settings.footer}</small>
          </div>
          <nav aria-label="Website footer">
            {menus
              .filter((m) => m.placement === "Footer" || m.placement === "Utility")
              .map((m) => (
                <div key={m.id}>{navItems(m.items)}</div>
              ))}
            <Button onClick={() => navigate("contact")}>Contact our school</Button>
          </nav>
          <div className="web-footer-bottom">
            © {x.now.slice(0, 4)} {x.school} · Prototype preview · no analytics, hosting or SEO
            indexing
          </div>
        </footer>
      </div>
    </div>
  );
}
