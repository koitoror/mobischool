import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useCredentialsOptional } from "./CredentialsContext";
import {
  seedCMS,
  contentError,
  assetError,
  assetUsage,
  menuError,
  uid,
  isPublic,
  type CMSState,
  type Content,
  type Asset,
  type Menu,
  type SiteSettings,
} from "./cmsModel";
function useStore(school: string, session: string, identity: { logo: string; motto: string }) {
  const [all, setAll] = useState<Record<string, CMSState>>({}),
    [revision, setRevision] = useState(0),
    ref = useRef(all);
  const state = ref.current[school] || seedCMS(school, session);
  if (!ref.current[school]) ref.current[school] = state;
  const update = (fn: (s: CMSState) => CMSState) => {
    const next = fn(ref.current[school]);
    ref.current = { ...ref.current, [school]: next };
    setAll(ref.current);
    setRevision(revision + 1);
  };
  const [now, setNow] = useState("2025-02-24T12:00"),
    [role, setRole] = useState("School Administrator");
  const [settingsBySchool, setSettings] = useState<Record<string, SiteSettings>>({});
  const settings = settingsBySchool[school] || {
    sections: ["Introduction", "Pages", "News", "Events", "Gallery", "Admissions", "Contact"],
    bannerStyle: "Static hero",
    footer: "A community of curiosity, character and possibility.",
    seo: "School website · illustrative preview",
    reviewRequired: false,
    categories: [
      "School Life",
      "Academic News",
      "Sports",
      "Community",
      "Events",
      "Alumni",
      "Facilities",
      "Other",
    ],
    templates: ["Editorial", "Landing", "Information"],
  };
  const alumni = useCredentialsOptional();
  const actor = `${role} (unauthenticated preview)`,
    canPublish = ["School Administrator", "Publisher", "Website Administrator"].includes(role);
  const stamp = (action: string) => ({ at: new Date().toISOString(), actor, action });
  const save = (c: Content, reason: string) => {
    if (role === "Content Reviewer") throw Error("Reviewer preview can review, not edit content.");
    if (["Published", "Scheduled"].includes(c.status) && !canPublish)
      throw Error("Publisher preview role required.");
    if (!reason.trim()) throw Error("Add a review / change note.");
    update((s) => {
      const error = contentError(c, s, now);
      if (error) throw Error(error);
      const old = s.content.find((v) => v.id === c.id);
      if (
        settings.reviewRequired &&
        ["Published", "Scheduled"].includes(c.status) &&
        old &&
        !["Approved", "Published", "Scheduled"].includes(old.status)
      )
        throw Error("Submit for review and approve this record before publishing.");
      if (
        ["Archived", "Unpublished"].includes(c.status) &&
        s.menus.some((m) => m.status === "Published" && m.items.some((i) => i.destination === c.id))
      )
        throw Error("Remove this destination from published menus first.");
      const next = {
        ...structuredClone(c),
        version: (old?.version || 0) + 1,
        updated: new Date().toISOString(),
        published: ["Published", "Scheduled"].includes(c.status) ? now : c.published,
        history: [
          ...(old?.history || []),
          stamp(`${old?.status || "New"} → ${c.status}: ${reason}`),
        ],
      };
      return {
        ...s,
        content: [...s.content.filter((v) => v.id !== c.id), next],
        versions: old ? [...s.versions, old] : s.versions,
      };
    });
  };
  return {
    ...state,
    school,
    session,
    identity,
    now,
    setNow,
    role,
    setRole,
    actor,
    canPublish,
    settings,
    alumni,
    setSettings: (settings: SiteSettings) => setSettings((v) => ({ ...v, [school]: settings })),
    save,
    review: (id: string, note: string) => {
      if (
        ![
          "School Administrator",
          "Content Reviewer",
          "Publisher",
          "Website Administrator",
        ].includes(role)
      )
        throw Error("Use a reviewer preview role.");
      if (!note.trim()) throw Error("Review comment required.");
      update((s) => ({
        ...s,
        content: s.content.map((c) =>
          c.id === id
            ? { ...c, status: "Approved", history: [...c.history, stamp("Approved: " + note)] }
            : c,
        ),
      }));
    },
    saveAsset: (a: Asset) => {
      if (!canPublish && role !== "Content Editor")
        throw Error("Media editing is restricted in this preview role.");
      update((s) => {
        const error = assetError(a, s.assets);
        if (error) throw Error(error);
        if (
          (a.status !== "Active" || a.visibility !== "Public") &&
          assetUsage(a.id, s.content).some((c) => isPublic(c, school, now))
        )
          throw Error("Asset is used by public content. Unpublish or replace references first.");
        const old = s.assets.find((v) => v.id === a.id);
        return {
          ...s,
          assets: [
            ...s.assets.filter((v) => v.id !== a.id),
            {
              ...a,
              history: [...(old?.history || []), stamp("Asset metadata saved · no file stored")],
            },
          ],
        };
      });
    },
    saveMenu: (m: Menu) => {
      if (!canPublish) throw Error("Website publisher preview required.");
      update((s) => {
        const error = menuError(m, s);
        if (error) throw Error(error);
        return {
          ...s,
          menus: [
            ...s.menus.filter((v) => v.id !== m.id),
            { ...m, history: [...m.history, stamp("Menu saved: " + m.status)] },
          ],
        };
      });
    },
    uid,
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function CMSProvider({
  school,
  session,
  logo,
  motto,
  children,
}: {
  school: string;
  session: string;
  logo: string;
  motto: string;
  children: ReactNode;
}) {
  const store = useStore(school, session, { logo, motto });
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useCMSOptional() {
  return useContext(Context);
}
export function useCMS() {
  const x = useContext(Context);
  if (!x) throw Error("CMSProvider required");
  return x;
}
