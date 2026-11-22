import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CMSProvider } from "../src/CMSContext";
import CMS from "../src/CMS";
import PublicWebsite from "../src/PublicWebsite";
import {
  seedCMS,
  cmsPages,
  isPublic,
  contentError,
  menuError,
  assetError,
  assetUsage,
  publicAsset,
  type Content,
} from "../src/cmsModel";
const school = "Test School",
  session = "2024 – 2025",
  now = "2025-02-24T12:00",
  s = seedCMS(school, session),
  page = s.content[0],
  asset = s.assets[0],
  menu = s.menus[0];
test("published public content visible", () => assert.equal(isPublic(page, school, now), true));
for (const status of ["Draft", "Review", "Approved", "Unpublished", "Archived"] as const)
  test(status + " never public", () =>
    assert.equal(isPublic({ ...page, status }, school, now), false),
  );
for (const visibility of ["Internal", "Restricted"])
  test(visibility + " never public", () =>
    assert.equal(isPublic({ ...page, visibility }, school, now), false),
  );
test("school scoping", () => assert.equal(isPublic(page, "Other School", now), false));
test("scheduled content gated by clock", () => {
  const c = { ...page, status: "Scheduled", schedule: "2025-03-01T12:00" } as Content;
  assert.equal(isPublic(c, school, now), false);
  assert.equal(isPublic(c, school, "2025-03-02T12:00"), true);
});
test("expired content hidden", () =>
  assert.equal(isPublic({ ...page, expires: "2025-01-01" }, school, now), false));
test("duplicate slug rejected", () =>
  assert.match(contentError({ ...page, id: "N" }, s, now), /already exists/));
test("invalid slug rejected", () =>
  assert.match(contentError({ ...page, slug: "Bad Path" }, s, now), /lowercase/));
test("empty page rejected", () =>
  assert.match(contentError({ ...page, blocks: [] }, s, now), /block/));
test("missing SEO rejected", () =>
  assert.match(contentError({ ...page, seoTitle: "" }, s, now), /SEO/));
test("circular page rejected", () =>
  assert.match(contentError({ ...page, parent: page.id }, s, now), /Circular/));
test("empty block rejected", () =>
  assert.match(
    contentError(
      {
        ...page,
        blocks: [
          {
            id: "B",
            type: "Text section",
            title: "",
            text: "",
            media: "",
            destination: "",
            enabled: true,
          },
        ],
      },
      s,
      now,
    ),
    /empty/,
  ));
test("bad schedule rejected", () =>
  assert.match(
    contentError({ ...page, status: "Scheduled", schedule: "invalid" }, s, now),
    /Schedule/,
  ));
test("invalid event range rejected", () => {
  const c = s.content.find((c) => c.kind === "Event")!;
  assert.match(contentError({ ...c, end: "2025-01-01" }, s, now), /date/);
});
test("gallery requires media", () => {
  const c = s.content.find((c) => c.kind === "Gallery")!;
  assert.match(contentError({ ...c, media: [] }, s, now), /media/);
});
test("banner requires alt", () => {
  const c = s.content.find((c) => c.kind === "Banner Images")!;
  assert.match(contentError({ ...c, alt: "" }, s, now), /alt/);
});
test("private media blocked on publish", () =>
  assert.match(
    contentError(page, { ...s, assets: [{ ...asset, visibility: "Internal" }] }, now),
    /public media/,
  ));
test("archived assets hidden publicly", () =>
  assert.equal(publicAsset(asset.id, [{ ...asset, status: "Archived" }], school), undefined));
test("media usage reconciles", () => assert.equal(assetUsage(asset.id, s.content).length, 6));
test("asset alt required", () =>
  assert.match(assetError({ ...asset, alt: "" }, []), /alternative/));
test("oversize asset blocked", () =>
  assert.match(assetError({ ...asset, size: 30 * 1024 * 1024 }, []), /25 MB/));
test("unsupported extension blocked", () =>
  assert.match(assetError({ ...asset, filename: "file.exe" }, []), /Unsupported/));
test("duplicate asset blocked", () =>
  assert.match(assetError({ ...asset, id: "N" }, [asset]), /already exists/));
test("valid menu accepted", () => assert.equal(menuError(menu, s), ""));
test("bad menu link rejected", () =>
  assert.match(
    menuError({ ...menu, items: [{ ...menu.items[0], destination: "missing" }] }, s),
    /destination/,
  ));
test("empty menu label rejected", () =>
  assert.match(menuError({ ...menu, items: [{ ...menu.items[0], label: "" }] }, s), /label/));
test("duplicate menu path rejected", () =>
  assert.match(
    menuError({ ...menu, items: [menu.items[0], { ...menu.items[0], id: "D" }] }, s),
    /Duplicate/,
  ));
test("circular menu rejected", () =>
  assert.match(
    menuError({ ...menu, items: [{ ...menu.items[0], parent: menu.items[0].id }] }, s),
    /Circular/,
  ));
test("public rendering excludes unpublished injected text", () => {
  const html = renderToStaticMarkup(
    h(CMSProvider, { school, session, logo: "", motto: "Motto", children: h(PublicWebsite) }),
  );
  assert.ok(html.includes("A world of possibility"));
  assert.ok(html.includes("NOT DEPLOYED"));
});
for (const route of cmsPages)
  test("SSR route " + route, () => {
    const html = renderToStaticMarkup(
      h(CMSProvider, {
        school,
        session,
        logo: "",
        motto: "Motto",
        children: h(CMS, {
          page: route,
          active: true,
          navigate: () => {},
          onDirty: () => {},
          notify: () => {},
        }),
      }),
    );
    assert.ok(html.includes("Illustrative Data"));
    assert.ok(!html.includes("NaN"));
  });
