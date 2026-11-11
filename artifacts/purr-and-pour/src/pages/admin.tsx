import {lazy, Suspense, useEffect, type ReactNode} from "react";
import {useClerk} from "@clerk/react";
import {Link, Redirect, useLocation} from "wouter";
import {useAdminIdentity} from "@/hooks/use-admin-identity";
import {adminSection, afterSignInPath, isAdminIdentity} from "@/lib/admin-access";
import {basePath} from "@/lib/cafe";
import NotFound from "./not-found";

const Workspace = lazy(() => import("@/components/admin-preview/workspace"));

function AccessMessage({title, children}: {title: string; children?: ReactNode}) {
  return <main className="grid h-[100dvh] place-items-center overflow-y-auto bg-background p-6">
    <section className="w-full max-w-lg space-y-5 border-[3px] border-foreground bg-card p-6 shadow-[6px_6px_0_currentColor]">
      <h1 className="font-pixel text-2xl" data-testid="text-admin-access-title">{title}</h1>
      {children}
      <Link href="/" className="block font-pixel underline" data-testid="link-access-cafe">Back to the café</Link>
    </section>
  </main>;
}

export function AdminLoading() {
  return <AccessMessage title="Checking staff access…"><p role="status" className="font-chalk text-xl">Verifying your account with the café server.</p></AccessMessage>;
}

function AccessError({retry}: {retry: () => void}) {
  return <AccessMessage title="Access check unavailable">
    <p>We couldn’t verify your permissions. The workspace stays locked until the server can confirm access.</p>
    <button type="button" className="border-2 border-foreground bg-primary px-4 py-2 font-pixel" onClick={retry} data-testid="button-retry-admin-access">Try again</button>
  </AccessMessage>;
}

export function AuthContinue() {
  const {isLoaded, isSignedIn, identity} = useAdminIdentity();
  if (!isLoaded) return <AdminLoading />;
  if (!isSignedIn) return <Redirect to="/sign-in" replace />;
  if (identity.isError) return <AccessError retry={() => {void identity.refetch();}} />;
  if (identity.isPending || !identity.data) return <AdminLoading />;
  return <Redirect to={afterSignInPath(identity.data)} replace />;
}

export default function AdminPage() {
  const {isLoaded, isSignedIn, userId, identity} = useAdminIdentity();
  const {signOut} = useClerk();
  const [location] = useLocation();
  useEffect(() => {
    const title = document.title;
    document.title = "Admin preview · Purr & Pour";
    return () => {document.title = title;};
  }, []);
  if (!isLoaded) return <AdminLoading />;
  if (!isSignedIn) return <Redirect to="/sign-in" replace />;
  if (identity.isError) return <AccessError retry={() => {void identity.refetch();}} />;
  if (identity.isPending || !identity.data) return <AdminLoading />;
  if (!isAdminIdentity(identity.data)) return <AccessMessage title="Admin access required">
    <p data-testid="text-admin-denied">You’re signed in, but this account does not have the café’s admin role. Customers and staff cannot open this workspace.</p>
    <p>Ask the café owner to grant access to your account. Public prototype credentials do not grant permission.</p>
    <button type="button" className="font-pixel underline" onClick={() => {void signOut({redirectUrl: basePath || "/"});}} data-testid="button-denied-signout">Sign out to use another account</button>
  </AccessMessage>;
  if (location === "/admin" || location === "/admin/") return <Redirect to="/admin/orders" replace />;
  const section = adminSection(location);
  if (!section) return <NotFound />;
  return <Suspense fallback={<AdminLoading />}>
    <Workspace key={userId} view={section} onSignOut={() => {void signOut({redirectUrl: basePath || "/"});}} />
  </Suspense>;
}
