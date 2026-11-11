import test from "node:test";
import assert from "node:assert/strict";
import {ADMIN_SECTIONS, adminSection, isAdminIdentity, afterSignInPath} from "../src/lib/admin-access.ts";

test("only a signed-in server identity with the exact admin role is allowed", () => {
  assert.equal(isAdminIdentity({signedIn: true, role: "admin"}), true);
  for (const identity of [null, undefined, {}, [], "admin", {signedIn: false, role: "admin"}, {signedIn: true, role: "staff"}, {signedIn: true, role: "customer"}, {signedIn: "true", role: "admin"}, {signedIn: true, role: "Admin"}, {publicMetadata: {role: "admin"}}]) {
    assert.equal(isAdminIdentity(identity), false);
  }
});

test("admin sign-in continues to orders, not the public demo login", () => {
  assert.equal(afterSignInPath({signedIn: true, role: "admin"}), "/admin/orders");
  assert.equal(afterSignInPath({signedIn: true, role: "staff"}), "/");
  assert.equal(afterSignInPath({signedIn: true, role: "customer"}), "/");
  assert.equal(afterSignInPath(undefined), "/");
});

test("only explicit supported sections are routed; auth-looking query strings cannot unlock a section", () => {
  for (const section of ADMIN_SECTIONS) {
    assert.equal(adminSection(`/admin/${section}`), section);
    assert.equal(adminSection(`/admin/${section}/`), section);
  }
  for (const path of ["/", "/admin", "/admin/", "/admin/login", "/admin/unknown", "/anything/orders", "/admin/orders/extra", "/admin/orders?role=admin", "/admin/?view=orders", "//admin/orders"]) {
    assert.equal(adminSection(path), null);
  }
});
