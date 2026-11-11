import { useEffect, useRef, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Cafe from "@/pages/cafe";
import AdminPage, { AuthContinue } from "@/pages/admin";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#e2843a",
    colorForeground: "#3a2416",
    colorMutedForeground: "#6b4a34",
    colorDanger: "#bb3a2c",
    colorBackground: "#f4ece1",
    colorInput: "#fbf6ef",
    colorInputForeground: "#3a2416",
    colorNeutral: "#3a2416",
    fontFamily: "'Bricolage Grotesque', sans-serif",
    borderRadius: "2px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#f4ece1] rounded-none w-[400px] max-w-full overflow-hidden border-[3px] border-[#3a2416] shadow-[6px_6px_0_#3a2416]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-['Pixelify_Sans'] text-2xl text-[#3a2416]",
    headerSubtitle: "text-[#6b4a34]",
    socialButtonsBlockButtonText: "text-[#3a2416] font-semibold",
    formFieldLabel: "text-[#3a2416] font-semibold",
    footerActionLink: "text-[#c4651f] font-semibold",
    footerActionText: "text-[#6b4a34]",
    dividerText: "text-[#6b4a34]",
    identityPreviewEditButton: "text-[#c4651f]",
    formFieldSuccessText: "text-[#2f6b45]",
    alertText: "text-[#3a2416]",
    logoBox: "justify-center",
    logoImage: "h-12 w-12 [image-rendering:pixelated]",
    socialButtonsBlockButton: "border-2 border-[#3a2416] bg-[#fbf6ef] rounded-none",
    formButtonPrimary: "bg-[#e2843a] text-[#fbf6ef] rounded-none border-2 border-[#3a2416] shadow-[3px_3px_0_#3a2416] font-['Pixelify_Sans']",
    formFieldInput: "rounded-none border-2 border-[#8a6a52] bg-[#fbf6ef] text-[#3a2416]",
    footerAction: "justify-center",
    dividerLine: "bg-[#8a6a52]",
    alert: "border-2 border-[#bb3a2c] bg-[#fbeee6] rounded-none",
    otpCodeFieldInput: "border-2 border-[#8a6a52] rounded-none",
    formFieldRow: "gap-2",
    main: "gap-5",
  },
};

function AuthStage({ children }: { children: ReactNode }) {
  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-background">
      <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-10">
        <img src={`${basePath}/sprites/draft.png`} alt="" className="hidden" />
        {children}
        <a href={`${basePath}/`} className="font-pixel text-sm underline">Back to the counter</a>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthStage>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={`${basePath}/auth/continue`} />
    </AuthStage>
  );
}

function SignUpPage() {
  return (
    <AuthStage>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={`${basePath}/auth/continue`} />
    </AuthStage>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Back at the counter", subtitle: "Sign in to keep your stamps and baristas" } },
        signUp: { start: { title: "Get a regular's card", subtitle: "Your pets and stamps follow you anywhere" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <RoutedErrorBoundary>
            <Switch>
              <Route path="/" component={Cafe} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/auth/continue" component={AuthContinue} />
              <Route path="/admin/*?" component={AdminPage} />
              <Route component={NotFound} />
            </Switch>
          </RoutedErrorBoundary>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
