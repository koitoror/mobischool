import { useState } from "react";
import { useCMS } from "./CMSContext";
import { Button, Field, Card } from "./components/OperationsUI";
import {
  blockTypes,
  statuses,
  uid,
  newContent,
  assetUsage,
  type Content,
  type ContentKind,
  type Asset,
  type Menu,
  type MenuItem,
} from "./cmsModel";
export function ContentEditor({
  record,
  kind,
  done,
}: {
  record?: Content;
  kind: ContentKind;
  done: (s: string) => void;
}) {
  const x = useCMS(),
    [c, setC] = useState<Content>(() =>
      record ? structuredClone(record) : newContent(kind, x.school, x.session, x.actor),
    ),
    [tab, setTab] = useState("Content"),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [blockType, setBlockType] = useState("Text section");
  const set = (key: keyof Content, v: unknown) => {
    setConfirm(false);
    setC({ ...c, [key]: v });
  };
  const f = (label: string, key: keyof Content, options?: string[], type = "text") => (
    <Field
      label={label}
      value={String(c[key])}
      options={options}
      type={type}
      onChange={(v) => set(key, key === "order" ? Number(v) : v)}
    />
  );
  const mediaOptions = ["None", ...x.assets.filter((a) => a.status === "Active").map((a) => a.id)];
  const imageField = (label: string, key: keyof Content) => (
    <Field
      label={label}
      value={String(c[key]) || "None"}
      options={mediaOptions}
      onChange={(v) => set(key, v === "None" ? "" : v)}
    />
  );
  const move = (i: number, delta: number) => {
    const blocks = [...c.blocks];
    [blocks[i], blocks[i + delta]] = [blocks[i + delta], blocks[i]];
    set("blocks", blocks);
  };
  return (
    <>
      <div className="cms-editor-tabs">
        {["Content", "Design & media", "Publishing & SEO", "History"].map((t) => (
          <Button key={t} disabled={t === tab} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>
      {tab === "Content" ? (
        <>
          <div className="cms-fields">
            {f("Title", "title")}
            {f("Slug", "slug")}
            {f("Category", "category", x.settings.categories)}
            {f("Academic session", "session")}
          </div>
          {f("Short summary", "summary", undefined, "textarea")}
          {kind !== "Gallery" && f("Body / editorial text", "body", undefined, "textarea")}
          {kind === "Event" && (
            <>
              <div className="cms-fields">
                {f("Start date", "start", undefined, "date")}
                {f("End date", "end", undefined, "date")}
                {f("Start time", "startTime", undefined, "time")}
                {f("End time", "endTime", undefined, "time")}
                {f("Venue", "venue")}
                {f("Organizer", "organizer")}
                {f("Target audience", "audience")}
                {f("Registration", "registration", ["Not collected", "Information only"])}
                {f("Registration deadline", "deadline", undefined, "date")}
                {f("Public contact information", "contact")}
              </div>
              <Field
                label="Related Alumni event (reference only)"
                value={c.alumniEvent || "None"}
                options={["None", ...(x.alumni?.events || []).map((e) => e.id)]}
                onChange={(v) => set("alumniEvent", v === "None" ? "" : v)}
              />
              <p>Alumni event ownership, RSVP and publication remain separate.</p>
            </>
          )}
          {["Pages", "News"].includes(kind) && (
            <>
              <div className="cms-block-toolbar">
                <Field
                  label="Add block type"
                  value={blockType}
                  options={blockTypes}
                  onChange={setBlockType}
                />
                <Button
                  icon="plus"
                  onClick={() =>
                    set("blocks", [
                      ...c.blocks,
                      {
                        id: uid("BLOCK"),
                        type: blockType,
                        title: "",
                        text: "",
                        media: "",
                        destination: "",
                        enabled: true,
                      },
                    ])
                  }
                >
                  Add block
                </Button>
              </div>
              {!c.blocks.length && (
                <div className="op-empty">
                  <strong>Start with a section.</strong>
                  <p>Add a hero, text, image, feed or call-to-action. No coding required.</p>
                </div>
              )}
              {c.blocks.map((b, i) => (
                <Card
                  key={b.id}
                  title={`${String(i + 1).padStart(2, "0")} · ${b.type}`}
                  action={
                    <div className="cms-inline">
                      <Button disabled={!i} onClick={() => move(i, -1)}>
                        Move up
                      </Button>
                      <Button disabled={i === c.blocks.length - 1} onClick={() => move(i, 1)}>
                        Move down
                      </Button>
                      <Button
                        onClick={() =>
                          set(
                            "blocks",
                            c.blocks.map((v) =>
                              v.id === b.id ? { ...v, enabled: !v.enabled } : v,
                            ),
                          )
                        }
                      >
                        {b.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        danger
                        onClick={() => {
                          if (window.confirm("Remove this content block?"))
                            set(
                              "blocks",
                              c.blocks.filter((v) => v.id !== b.id),
                            );
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  }
                >
                  <div className="cms-pad">
                    <Field
                      label={`Block ${i + 1} heading`}
                      value={b.title}
                      onChange={(title) =>
                        set(
                          "blocks",
                          c.blocks.map((v) => (v.id === b.id ? { ...v, title } : v)),
                        )
                      }
                    />
                    <Field
                      label={`Block ${i + 1} content`}
                      type="textarea"
                      value={b.text}
                      hint={
                        b.type === "Custom HTML placeholder"
                          ? "Rendered as escaped text; scripts and HTML never execute."
                          : "Plain structured content. Feature cards / columns use | separators."
                      }
                      onChange={(text) =>
                        set(
                          "blocks",
                          c.blocks.map((v) => (v.id === b.id ? { ...v, text } : v)),
                        )
                      }
                    />
                    <Field
                      label={`Block ${i + 1} media`}
                      value={b.media || "None"}
                      options={mediaOptions}
                      onChange={(media) =>
                        set(
                          "blocks",
                          c.blocks.map((v) =>
                            v.id === b.id ? { ...v, media: media === "None" ? "" : media } : v,
                          ),
                        )
                      }
                    />
                    <Field
                      label={`Block ${i + 1} link`}
                      value={b.destination}
                      onChange={(destination) =>
                        set(
                          "blocks",
                          c.blocks.map((v) => (v.id === b.id ? { ...v, destination } : v)),
                        )
                      }
                    />
                  </div>
                </Card>
              ))}
              <div className="cms-live-preview">
                <small>LIVE STRUCTURED PREVIEW · NOT PUBLIC</small>
                <strong>{c.title || "Your page title"}</strong>
                <p>{c.body}</p>
                {c.blocks
                  .filter((b) => b.enabled)
                  .map((b) => (
                    <div key={b.id}>
                      <strong>{b.title || b.type}</strong>
                      <p>{b.text}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
          {kind === "Gallery" && (
            <>
              <p>Select shared assets; removing an image only removes its album reference.</p>
              {x.assets
                .filter((a) => a.status === "Active")
                .map((a) => (
                  <div className="cms-inline" key={a.id}>
                    <Button
                      onClick={() =>
                        set(
                          "media",
                          c.media.includes(a.id)
                            ? c.media.filter((id) => id !== a.id)
                            : [...c.media, a.id],
                        )
                      }
                    >
                      {c.media.includes(a.id) ? "Remove from album" : "Add to album"}: {a.title}
                    </Button>
                    <span>{a.alt || "Missing alt text"}</span>
                  </div>
                ))}
              {c.media.map((id, i) => (
                <div className="cms-inline" key={id}>
                  <span>
                    {i + 1}. {x.assets.find((a) => a.id === id)?.title}
                  </span>
                  <Button
                    disabled={i === 0}
                    onClick={() => {
                      const ids = [...c.media];
                      [ids[i], ids[i - 1]] = [ids[i - 1], ids[i]];
                      set("media", ids);
                    }}
                  >
                    Move image up
                  </Button>
                </div>
              ))}
            </>
          )}
        </>
      ) : tab === "Design & media" ? (
        <>
          <div className="cms-fields">
            {imageField("Featured / cover image", "image")}
            {imageField("Social sharing image", "socialImage")}
            {imageField("Mobile banner image", "mobileImage")}
            {f("Display order", "order", undefined, "number")}
            {f("Page template", "template", x.settings.templates)}
            {f("Visibility", "visibility", ["Public", "Internal", "Restricted"])}
          </div>
          <Field
            label="Featured content"
            value={c.featured ? "Yes" : "No"}
            options={["No", "Yes"]}
            onChange={(v) => set("featured", v === "Yes")}
          />
          {kind === "Pages" && (
            <Field
              label="Parent page"
              value={c.parent || "None"}
              options={[
                "None",
                ...x.content.filter((v) => v.kind === "Pages" && v.id !== c.id).map((v) => v.id),
              ]}
              onChange={(v) => set("parent", v === "None" ? "" : v)}
            />
          )}
          <Field
            label="Related event"
            value={c.relatedEvent || "None"}
            options={["None", ...x.content.filter((v) => v.kind === "Event").map((v) => v.id)]}
            onChange={(v) => set("relatedEvent", v === "None" ? "" : v)}
          />
          <Field
            label="Related gallery"
            value={c.relatedGallery || "None"}
            options={["None", ...x.content.filter((v) => v.kind === "Gallery").map((v) => v.id)]}
            onChange={(v) => set("relatedGallery", v === "None" ? "" : v)}
          />
          {kind === "Banner Images" && (
            <>
              {f("Banner alternative text", "alt")}
              {f("Call-to-action label", "ctaLabel")}
              {f(
                "Destination (page ID, home, news, events, gallery, contact or https URL)",
                "destination",
              )}
              {f("Banner start date", "start", undefined, "date")}
              {f("Banner end date", "expires", undefined, "date")}
              <p>
                Recommended image: wide editorial crop; mobile falls back to desktop image. No
                automatic carousel.
              </p>
            </>
          )}
        </>
      ) : tab === "Publishing & SEO" ? (
        <>
          <div className="cms-fields">
            {f("Publication status", "status", statuses)}
            {f("Author", "author")}
            {f("Scheduled publication", "schedule", undefined, "datetime-local")}
            {f("SEO title", "seoTitle")}
          </div>
          {f("SEO description", "seoDescription", undefined, "textarea")}
          {f("Tags", "tags")}
          <p>
            Public path preview: /{c.kind === "Pages" ? "" : c.kind.toLowerCase() + "/"}
            {c.slug}. Only public, published or due-scheduled content can appear.
          </p>
        </>
      ) : (
        <>
          <p>
            Version {c.version} · created {c.created} · updated {c.updated}
          </p>
          {c.history.map((h, i) => (
            <p key={i}>
              {h.at} · {h.actor} · {h.action}
            </p>
          ))}
          <p>
            Retained previous versions:{" "}
            {x.versions
              .filter((v) => v.id === c.id)
              .map((v) => v.version)
              .join(", ") || "None"}
          </p>
        </>
      )}
      <Field
        label="Review / change note"
        value={note}
        onChange={(v) => {
          setNote(v);
          setConfirm(false);
        }}
      />
      {confirm ? (
        <>
          <div className="op-notice">
            Confirm {c.status.toLowerCase()} “{c.title}”. Publishing validates required content,
            links and media. This is browser-memory only.
          </div>
          <Button
            primary
            onClick={() => {
              try {
                x.save(c, note);
                done("Content saved · " + c.status);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Confirm content change
          </Button>
        </>
      ) : (
        <Button primary onClick={() => setConfirm(true)}>
          Review changes
        </Button>
      )}
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
}
export function MediaEditor({ asset, done }: { asset?: Asset; done: (s: string) => void }) {
  const x = useCMS(),
    [a, setA] = useState<Asset>(
      asset
        ? structuredClone(asset)
        : {
            id: uid("MEDIA"),
            school: x.school,
            filename: "",
            type: "Image",
            size: 1024,
            title: "",
            description: "",
            alt: "",
            category: "School Life",
            tags: "",
            visibility: "Public",
            status: "Active",
            url: "",
            created: new Date().toISOString(),
            actor: x.actor,
            history: [],
          },
    ),
    [progress, setProgress] = useState("Metadata only"),
    [error, setError] = useState("");
  const field = (label: string, key: keyof Asset, options?: string[], type = "text") => (
    <Field
      label={label}
      value={String(a[key])}
      options={options}
      type={type}
      onChange={(v) => setA({ ...a, [key]: key === "size" ? Number(v) : v })}
    />
  );
  return (
    <>
      <div className="cms-upload">
        <IconUpload />
        <strong>Bring your school’s story to life.</strong>
        <p>Upload simulation · no file bytes are stored. Enter metadata below.</p>
        <div className="cms-inline">
          <Button onClick={() => setProgress("Upload simulated · 100% · metadata only")}>
            Simulate upload
          </Button>
          <Button
            onClick={() =>
              setProgress("Upload failed (simulation). Retry or update file metadata.")
            }
          >
            Simulate upload failure
          </Button>
        </div>
        <p role="status">{progress}</p>
      </div>
      <div className="cms-fields">
        {field("File name", "filename")}
        {field("Asset title", "title")}
        {field("File type", "type", [
          "Image",
          "Logo",
          "Document",
          "PDF",
          "Video",
          "Audio",
          "Presentation",
          "Other",
        ])}
        {field("File size in bytes", "size", undefined, "number")}
        {field("Asset category", "category", x.settings.categories)}
        {field("Asset visibility", "visibility", ["Public", "Internal", "Restricted"])}
        {field("Asset status", "status", ["Active", "Review", "Archived"])}
      </div>
      {field("Alternative text", "alt")}
      {field("Caption / description", "description", undefined, "textarea")}
      {field("Asset tags", "tags")}
      <p>
        Usage:{" "}
        {assetUsage(a.id, x.content)
          .map((c) => `${c.kind}: ${c.title} (${c.status})`)
          .join(", ") || "Not referenced"}
      </p>
      <Button
        onClick={() => {
          setA({ ...a, url: "" });
          setProgress(
            "Replacement simulation selected. Previous generated image is removed on save; no replacement bytes stored.",
          );
        }}
      >
        Replace asset simulation
      </Button>
      <Button onClick={() => done("Media reference simulation: " + a.id)}>
        Copy media reference simulation
      </Button>
      <Button
        primary
        onClick={() => {
          try {
            x.saveAsset(a);
            done("Media metadata saved");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Save asset metadata
      </Button>
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
}
function IconUpload() {
  return <span className="cms-upload-symbol">↑</span>;
}
export function MenuEditor({ record, done }: { record?: Menu; done: (s: string) => void }) {
  const x = useCMS(),
    [m, setM] = useState<Menu>(
      record
        ? structuredClone(record)
        : {
            id: uid("MENU"),
            school: x.school,
            name: "",
            placement: "Primary",
            status: "Draft",
            items: [],
            history: [],
          },
    ),
    [error, setError] = useState("");
  const edit = (id: string, patch: Partial<MenuItem>) =>
    setM({ ...m, items: m.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  return (
    <>
      <div className="cms-fields">
        <Field label="Menu name" value={m.name} onChange={(name) => setM({ ...m, name })} />
        <Field
          label="Menu placement"
          value={m.placement}
          options={["Primary", "Footer", "Utility", "Mobile"]}
          onChange={(placement) => setM({ ...m, placement })}
        />
        <Field
          label="Menu status"
          value={m.status}
          options={["Draft", "Published", "Unpublished", "Archived"]}
          onChange={(status) => setM({ ...m, status })}
        />
      </div>
      {m.items.map((i, index) => (
        <Card key={i.id} title={`Item ${index + 1}`}>
          <div className="cms-pad cms-fields">
            <Field
              label={`Item ${index + 1} label`}
              value={i.label}
              onChange={(label) => edit(i.id, { label })}
            />
            <Field
              label={`Item ${index + 1} destination type`}
              value={i.type}
              options={[
                "CMS page",
                "News category",
                "Event listing",
                "Gallery",
                "External URL",
                "Custom route",
              ]}
              onChange={(type) => edit(i.id, { type })}
            />
            <Field
              label={`Item ${index + 1} destination`}
              value={i.destination}
              hint="Published page ID or home, news, events, gallery, contact, https URL"
              onChange={(destination) => edit(i.id, { destination })}
            />
            <Field
              label={`Item ${index + 1} parent`}
              value={i.parent || "None"}
              options={["None", ...m.items.filter((v) => v.id !== i.id).map((v) => v.id)]}
              onChange={(parent) => edit(i.id, { parent: parent === "None" ? "" : parent })}
            />
            <Field
              label={`Item ${index + 1} visibility`}
              value={i.visible ? "Visible" : "Hidden"}
              options={["Visible", "Hidden"]}
              onChange={(v) => edit(i.id, { visible: v === "Visible" })}
            />
            <Field
              label={`Item ${index + 1} new tab`}
              value={i.newTab ? "Yes" : "No"}
              options={["No", "Yes"]}
              onChange={(v) => edit(i.id, { newTab: v === "Yes" })}
            />
            <Button
              disabled={!index}
              onClick={() => {
                const items = [...m.items];
                [items[index], items[index - 1]] = [items[index - 1], items[index]];
                setM({ ...m, items });
              }}
            >
              Move item up
            </Button>
            <Button
              danger
              onClick={() => {
                if (window.confirm("Remove this menu item and detach its children?"))
                  setM({
                    ...m,
                    items: m.items
                      .filter((v) => v.id !== i.id)
                      .map((v) => (v.parent === i.id ? { ...v, parent: "" } : v)),
                  });
              }}
            >
              Remove menu item
            </Button>
          </div>
        </Card>
      ))}
      <Button
        onClick={() =>
          setM({
            ...m,
            items: [
              ...m.items,
              {
                id: uid("MI"),
                label: "",
                type: "CMS page",
                destination: "",
                parent: "",
                visible: true,
                newTab: false,
              },
            ],
          })
        }
      >
        Add menu item
      </Button>
      <div className="cms-menu-preview">
        {m.items
          .filter((i) => i.visible)
          .map((i) => (
            <span key={i.id}>
              {i.parent ? "↳ " : ""}
              {i.label || "Untitled"} → {i.destination || "Missing destination"}
            </span>
          ))}
      </div>
      <Button onClick={() => setM(record ? structuredClone(record) : { ...m, items: [] })}>
        Reset menu preview
      </Button>
      <Button
        primary
        onClick={() => {
          try {
            x.saveMenu(m);
            done("Menu saved");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Confirm save menu
      </Button>
      {error && (
        <div role="alert" className="op-form-error">
          {error}
        </div>
      )}
    </>
  );
}
