import { useEffect, useState } from "react";
import { useCMS } from "./CMSContext";
import { Button, Badge, Card, Field } from "./components/OperationsUI";
import { AssessmentTable as Table, AssessmentDialog as Dialog } from "./components/AssessmentUI";
import { cmsPages, isPublic, assetUsage, statuses, type ContentKind } from "./cmsModel";
import { ContentEditor, MediaEditor, MenuEditor } from "./CMSEditors";
import PublicWebsite from "./PublicWebsite";
import "./cms.css";
export default function CMS({
  page,
  active,
  navigate,
  onDirty,
  notify,
}: {
  page: string;
  active: boolean;
  navigate: (s: string) => void;
  onDirty: (b: boolean) => void;
  notify: (s: string) => void;
}) {
  const x = useCMS(),
    [dialog, setDialog] = useState(""),
    [id, setId] = useState(""),
    [q, setQ] = useState(""),
    [status, setStatus] = useState("All"),
    [category, setCategory] = useState("All"),
    [author, setAuthor] = useState("All"),
    [date, setDate] = useState(""),
    [session, setSession] = useState("All"),
    [sort, setSort] = useState("Newest"),
    [index, setIndex] = useState(1),
    [grid, setGrid] = useState(false),
    [columns, setColumns] = useState(true),
    [state, setState] = useState("Ready"),
    [kind, setKind] = useState<ContentKind>("Pages"),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (active) onDirty(!!dialog);
    return () => onDirty(false);
  }, [active, dialog, onDirty]);
  useEffect(() => {
    setQ("");
    setIndex(1);
    setStatus("All");
  }, [page]);
  const open = (d: string, record = "", k: ContentKind = page as ContentKind) => {
    setId(record);
    setKind(k);
    setDialog(d);
    setError("");
    setNote("");
  };
  const done = (s: string) => {
    notify(s);
    setDialog("");
  };
  const close = () => {
    if (
      ["Edit content", "Media metadata", "Menu editor"].includes(dialog) &&
      !window.confirm("Discard unsaved CMS changes?")
    )
      return;
    setDialog("");
  };
  const go = (p: string) => {
    if (dialog && !window.confirm("Discard current CMS workflow?")) return;
    setDialog("");
    navigate(p);
  };
  const items = x.content
    .filter(
      (c) =>
        (page === "Front CMS Overview" || c.kind === page) &&
        (status === "All" || c.status === status) &&
        (category === "All" || c.category === category) &&
        (author === "All" || c.author === author) &&
        (session === "All" || c.session === session) &&
        (!date || c.updated.slice(0, 10) === date) &&
        `${c.title} ${c.slug}`.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Newest"
        ? b.updated.localeCompare(a.updated)
        : a.title.localeCompare(b.title) * (sort === "A–Z" ? 1 : -1),
    );
  const record = x.content.find((c) => c.id === id);
  const filters = (
    <div className="cms-filters">
      <Field
        label="Search CMS"
        value={q}
        onChange={(v) => {
          setQ(v);
          setIndex(1);
        }}
      />
      <Field
        label="Content status"
        value={status}
        options={["All", ...statuses]}
        onChange={(v) => {
          setStatus(v);
          setIndex(1);
        }}
      />
      <Field
        label="Category filter"
        value={category}
        options={["All", ...x.settings.categories]}
        onChange={setCategory}
      />
      <Field
        label="Author filter"
        value={author}
        options={["All", ...new Set(x.content.map((c) => c.author))]}
        onChange={setAuthor}
      />
      <Field
        label="Session filter"
        value={session}
        options={["All", x.session]}
        onChange={setSession}
      />
      <Field label="Modified date" value={date} type="date" onChange={setDate} />
      <Field
        label="Sort content"
        value={sort}
        options={["Newest", "A–Z", "Z–A"]}
        onChange={setSort}
      />
      <Button
        onClick={() => {
          setQ("");
          setStatus("All");
          setCategory("All");
          setAuthor("All");
          setDate("");
          setSession("All");
          setIndex(1);
        }}
      >
        Clear filters
      </Button>
      <Button onClick={() => setColumns(!columns)}>
        {columns ? "Hide detail columns" : "Show detail columns"}
      </Button>
      <Button onClick={() => setGrid(!grid)}>{grid ? "List view" : "Grid view"}</Button>
    </div>
  );
  return (
    <div className="op cms" hidden={!active}>
      <div className="cms-heading">
        <div>
          <div className="op-eyebrow">OPERATIONS / FRONT CMS</div>
          <div className="cms-title" role="heading" aria-level={1}>
            {page}
          </div>
          <p>Your school’s story. Thoughtfully published.</p>
        </div>
        <div className="cms-inline">
          <Button onClick={() => open("Website settings")}>Website settings</Button>
          <Button primary onClick={() => go("Public Website Preview")}>
            Preview website ↗
          </Button>
        </div>
      </div>
      <div className="op-context">
        <Field label="Front CMS workspace" value={page} options={cmsPages} onChange={go} />
        <Badge>Illustrative Data</Badge>
        <span>
          {x.school} · {x.session}
        </span>
      </div>
      <div className="cms-tabs">
        {cmsPages
          .filter((p) => p !== "Front CMS Overview" && p !== "Public Website Preview")
          .map((p) => (
            <Button key={p} disabled={p === page} onClick={() => go(p)}>
              {p}
            </Button>
          ))}
      </div>
      <div className="op-notice">
        UI prototype · content and uploads reset on reload. No media storage, public deployment,
        real registrations, SEO indexing, scheduled infrastructure or secure role enforcement.
      </div>
      {state !== "Ready" ? (
        <Card title={state}>
          <div className="op-empty">
            <strong>
              {state === "Restricted"
                ? "Access restricted"
                : state === "Error"
                  ? "Content could not be loaded"
                  : state === "Loading"
                    ? "Loading preview"
                    : "No content in this preview"}
            </strong>
            <Button onClick={() => setState("Ready")}>Recover CMS workspace</Button>
          </div>
        </Card>
      ) : page === "Public Website Preview" ? (
        <PublicWebsite />
      ) : page === "Front CMS Overview" ? (
        <>
          <div className="cms-dashboard-intro">
            <div>
              <small>THE DIGITAL FRONT DOOR</small>
              <div className="cms-title">
                A remarkable school deserves
                <br />a story beautifully told.
              </div>
              <p>Build, review and preview your school’s public presence.</p>
              <Button onClick={() => open("Edit content", "", "Pages")}>Create a page</Button>
            </div>
            <img src="/images/school-campus.png" alt="AI-generated illustrative school campus" />
          </div>
          <div className="cms-kpis">
            {[
              [
                "Published pages",
                x.content.filter((c) => c.kind === "Pages" && isPublic(c, x.school, x.now)).length,
                "Pages",
              ],
              [
                "Draft pages",
                x.content.filter((c) => c.kind === "Pages" && c.status === "Draft").length,
                "Pages",
              ],
              [
                "Published news",
                x.content.filter((c) => c.kind === "News" && isPublic(c, x.school, x.now)).length,
                "News",
              ],
              [
                "Upcoming events",
                x.content.filter(
                  (c) =>
                    c.kind === "Event" &&
                    isPublic(c, x.school, x.now) &&
                    c.end >= x.now.slice(0, 10),
                ).length,
                "Event",
              ],
              ["Gallery albums", x.content.filter((c) => c.kind === "Gallery").length, "Gallery"],
              ["Media assets", x.assets.length, "Media Manager"],
              ["Active menus", x.menus.filter((m) => m.status === "Published").length, "Menus"],
              [
                "Active banners",
                x.content.filter(
                  (c) =>
                    c.kind === "Banner Images" &&
                    isPublic(c, x.school, x.now) &&
                    (!c.start || c.start <= x.now.slice(0, 10)),
                ).length,
                "Banner Images",
              ],
            ].map(([label, count, route]) => (
              <Button key={String(label)} onClick={() => go(String(route))}>
                <span>
                  <small>{label}</small>
                  <strong>{count}</strong>
                  <small>View records →</small>
                </span>
              </Button>
            ))}
          </div>
          <div className="cms-inline">
            {(["News", "Event", "Gallery", "Pages", "Banner Images"] as ContentKind[]).map((k) => (
              <Button key={k} onClick={() => open("Edit content", "", k)}>
                Create {k}
              </Button>
            ))}
            <Button onClick={() => go("Media Manager")}>Upload Media</Button>
          </div>
          {filters}
          <div className="cms-overview-grid">
            <Card title="Publishing desk" sub="Latest content • shared publication records">
              <Table
                headers={["Title", "Type", "Status", "Version"]}
                rows={items
                  .slice(0, 8)
                  .map((c) => [
                    <Button onClick={() => open("Edit content", c.id, c.kind)}>{c.title}</Button>,
                    c.kind,
                    <Badge>{c.status}</Badge>,
                    `v${c.version}`,
                  ])}
              />
            </Card>
            <Card
              title="Review & scheduled content"
              sub="Scheduling follows the adjustable simulation clock."
            >
              <div className="cms-pad">
                {x.content
                  .filter((c) => ["Review", "Scheduled"].includes(c.status))
                  .map((c) => (
                    <p key={c.id}>
                      {c.title} · {c.status} · {c.schedule}
                    </p>
                  ))}
                <p>
                  {x.content.filter((c) => c.status === "Review").length} awaiting review ·{" "}
                  {x.content.filter((c) => c.status === "Scheduled").length} scheduled.
                </p>
                <p>
                  Completeness: {x.content.filter((c) => c.seoTitle && c.seoDescription).length}/
                  {x.content.length} records have SEO metadata.
                </p>
                <Button
                  onClick={() => {
                    notify(
                      `CMS report simulation: ${x.content.length} content records; ${x.assets.length} media; ${x.content.reduce((n, c) => n + c.history.length, 0)} audit entries. No file created.`,
                    );
                  }}
                >
                  CMS activity report simulation
                </Button>
              </div>
            </Card>
          </div>
        </>
      ) : page === "Media Manager" ? (
        <Card
          title="Media library"
          sub="Shared references, not duplicated files."
          action={<Button onClick={() => open("Media metadata")}>Upload media simulation</Button>}
        >
          {filters}
          <div className={grid ? "cms-media-grid" : "cms-media-list"}>
            {x.assets
              .filter((a) => `${a.title} ${a.filename}`.toLowerCase().includes(q.toLowerCase()))
              .map((a) => (
                <article className="cms-media-card" key={a.id}>
                  {a.url ? (
                    <img src={a.url} alt={a.alt} />
                  ) : (
                    <div className="cms-file-placeholder">{a.type} · metadata only</div>
                  )}
                  <div>
                    <strong>{a.title}</strong>
                    <p>
                      {a.filename} · {Math.round(a.size / 1024)} KB
                    </p>
                    <p>
                      <Badge>{a.status}</Badge> · {assetUsage(a.id, x.content).length} usage
                      references
                    </p>
                    <Button onClick={() => open("Media metadata", a.id)}>
                      Preview / edit metadata
                    </Button>
                  </div>
                </article>
              ))}
          </div>
        </Card>
      ) : page === "Menus" ? (
        <Card
          title="Website navigation"
          sub="The public preview consumes these published menu records."
          action={<Button onClick={() => open("Menu editor")}>Create menu</Button>}
        >
          {x.menus.map((m) => (
            <div className="cms-menu-row" key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <p>
                  {m.placement} · {m.items.length} items · {m.status}
                </p>
              </div>
              <Button onClick={() => open("Menu editor", m.id)}>Edit / preview menu</Button>
            </div>
          ))}
        </Card>
      ) : (
        <Card
          title={`${page} publishing workspace`}
          sub="Draft → Review → Approved → Scheduled / Published → Unpublished → Archived"
          action={
            <Button primary onClick={() => open("Edit content")}>
              Create{" "}
              {page === "Pages" ? "page" : page === "Banner Images" ? "banner" : page.toLowerCase()}
            </Button>
          }
        >
          {filters}
          {grid ? (
            <div className="cms-media-grid">
              {items.slice((index - 1) * 8, index * 8).map((c) => (
                <article className="cms-media-card" key={c.id}>
                  {x.assets.find((a) => a.id === c.image)?.url && (
                    <img
                      src={x.assets.find((a) => a.id === c.image)?.url}
                      alt={x.assets.find((a) => a.id === c.image)?.alt}
                    />
                  )}
                  <div>
                    <Badge>{c.status}</Badge>
                    <strong>{c.title}</strong>
                    <p>{c.summary}</p>
                    <Button onClick={() => open("Edit content", c.id, c.kind)}>Edit content</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Table
              headers={[
                "Title / public path",
                "Status",
                ...(columns ? ["Category / session", "Author / version", "Updated"] : []),
                "Actions",
              ]}
              rows={items.slice((index - 1) * 8, index * 8).map((c) => [
                <div>
                  <strong>{c.title}</strong>
                  <small className="cms-path">/{c.slug}</small>
                </div>,
                <Badge>{c.status}</Badge>,
                ...(columns
                  ? [
                      `${c.category} · ${c.session}`,
                      `${c.author} · v${c.version}`,
                      c.updated.slice(0, 10),
                    ]
                  : []),
                <div className="cms-inline">
                  <Button onClick={() => open("Edit content", c.id, c.kind)}>Edit / publish</Button>
                  <Button onClick={() => open("Content detail", c.id, c.kind)}>
                    Preview / history
                  </Button>
                  <Button
                    onClick={() => {
                      const copy = {
                        ...structuredClone(c),
                        id: x.uid("CMS"),
                        title: c.title + " copy",
                        slug: c.slug + "-copy-" + x.uid("c").slice(-4),
                        status: "Draft" as const,
                        version: 0,
                        history: [],
                      };
                      try {
                        x.save(copy, "Duplicated as draft");
                        notify("Draft duplicated");
                      } catch (e) {
                        notify((e as Error).message);
                      }
                    }}
                  >
                    Duplicate
                  </Button>
                </div>,
              ])}
            />
          )}
          <div className="cms-inline cms-pad">
            <Button disabled={index === 1} onClick={() => setIndex(index - 1)}>
              Previous page
            </Button>
            <span>
              Page {index} · {items.length} records
            </span>
            <Button disabled={index * 8 >= items.length} onClick={() => setIndex(index + 1)}>
              Next page
            </Button>
          </div>
        </Card>
      )}
      {dialog && active && (
        <Dialog title={dialog} onClose={close}>
          {dialog === "Edit content" ? (
            <ContentEditor record={record} kind={kind} done={done} />
          ) : dialog === "Media metadata" ? (
            <MediaEditor asset={x.assets.find((a) => a.id === id)} done={done} />
          ) : dialog === "Menu editor" ? (
            <MenuEditor record={x.menus.find((m) => m.id === id)} done={done} />
          ) : dialog === "Content detail" && record ? (
            <>
              <Badge>{record.status}</Badge>
              <strong className="cms-title">{record.title}</strong>
              <p>{record.summary}</p>
              <p>{record.body}</p>
              <p>
                /{record.slug} · {record.visibility} · version {record.version}
              </p>
              {record.blocks.map((b) => (
                <div key={b.id}>
                  <strong>{b.title}</strong>
                  <p>{b.text}</p>
                </div>
              ))}
              {record.history.map((h, i) => (
                <p key={i}>
                  {h.at} · {h.action}
                </p>
              ))}
              <Field label="Review comment" value={note} onChange={setNote} />
              <Button
                onClick={() => {
                  try {
                    x.review(record.id, note);
                    done("Content approved");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Approve review
              </Button>
            </>
          ) : (
            <>
              <Field
                label="Preview role"
                value={x.role}
                options={[
                  "School Administrator",
                  "Content Editor",
                  "Content Reviewer",
                  "Publisher",
                  "Website Administrator",
                ]}
                onChange={x.setRole}
              />
              <Field
                label="Data state"
                value={state}
                options={["Ready", "Loading", "Empty", "Error", "Restricted"]}
                onChange={setState}
              />
              <Field
                label="Simulation clock"
                type="datetime-local"
                value={x.now}
                onChange={x.setNow}
              />
              <Field
                label="Banner presentation"
                value={x.settings.bannerStyle}
                options={["Static hero", "Manual sequence"]}
                onChange={(v) => x.setSettings({ ...x.settings, bannerStyle: v })}
              />
              <Field
                label="Review before publication"
                value={x.settings.reviewRequired ? "Required" : "Optional"}
                options={["Optional", "Required"]}
                onChange={(v) => x.setSettings({ ...x.settings, reviewRequired: v === "Required" })}
              />
              <Field
                label="Footer text"
                value={x.settings.footer}
                onChange={(v) => x.setSettings({ ...x.settings, footer: v })}
              />
              <Field
                label="Content categories (comma separated)"
                value={x.settings.categories.join(",")}
                onChange={(v) =>
                  x.setSettings({
                    ...x.settings,
                    categories: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Field
                label="Page templates (comma separated)"
                value={x.settings.templates.join(",")}
                onChange={(v) =>
                  x.setSettings({
                    ...x.settings,
                    templates: v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <p>Homepage sections · enable and reorder without code</p>
              {["Introduction", "Pages", "News", "Events", "Gallery", "Admissions", "Contact"].map(
                (section) => (
                  <div className="cms-inline" key={section}>
                    <Button
                      onClick={() =>
                        x.setSettings({
                          ...x.settings,
                          sections: x.settings.sections.includes(section)
                            ? x.settings.sections.filter((s) => s !== section)
                            : [...x.settings.sections, section],
                        })
                      }
                    >
                      {x.settings.sections.includes(section) ? "Enabled" : "Disabled"}: {section}
                    </Button>
                    <Button
                      disabled={x.settings.sections.indexOf(section) <= 0}
                      onClick={() => {
                        const sections = [...x.settings.sections],
                          i = sections.indexOf(section);
                        [sections[i], sections[i - 1]] = [sections[i - 1], sections[i]];
                        x.setSettings({ ...x.settings, sections });
                      }}
                    >
                      Move section up
                    </Button>
                  </div>
                ),
              )}
              <p>
                Branding comes from shared school identity. Contact details are not configured; the
                preview explicitly shows that gap. All role controls are unauthenticated
                recommendations.
              </p>
            </>
          )}
          {error && (
            <div role="alert" className="op-form-error">
              {error}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
