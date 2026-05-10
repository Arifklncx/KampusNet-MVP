import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Feed from "@/pages/feed";
import Onboarding from "@/pages/onboarding";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

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

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(230, 75%, 55%)",
    colorForeground: "hsl(224, 40%, 12%)",
    colorMutedForeground: "hsl(220, 15%, 50%)",
    colorDanger: "hsl(4, 86%, 58%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(220, 20%, 94%)",
    colorInputForeground: "hsl(224, 40%, 12%)",
    colorNeutral: "hsl(220, 20%, 88%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.625rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-bold text-xl",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium text-sm",
    footerActionLink: "text-primary font-semibold",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-destructive text-sm",
    logoBox: "flex justify-center mb-1",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-border bg-card hover:bg-muted/80 transition-colors text-sm",
    formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold",
    formFieldInput: "bg-muted border-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring",
    footerAction: "border-t border-border",
    dividerLine: "border-border",
    alert: "bg-destructive/10 border border-destructive/20 rounded-lg",
    otpCodeFieldInput: "border-input bg-muted text-foreground",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

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

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/40 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Sadece{" "}
            <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              .edu.tr
            </span>{" "}
            e-posta adresiyle giriş yapabilirsin
          </p>
        </div>
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/feed`}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/40 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            Sadece{" "}
            <span className="font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              .edu.tr
            </span>{" "}
            uzantılı üniversite e-postanla kayıt olabilirsin
          </p>
        </div>
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          forceRedirectUrl={`${basePath}/onboarding`}
        />
      </div>
    </div>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/feed" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

/**
 * Guards a route so that:
 * - Signed-out users → redirect to /
 * - Signed-in users with no profile → redirect to /onboarding (unless already there)
 * - Signed-in users with profile → render children
 */
function AuthGuard({
  component: Component,
  requireProfile = true,
}: {
  component: () => ReactNode;
  requireProfile?: boolean;
}) {
  return (
    <>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
      <Show when="signed-in">
        {requireProfile ? <ProfileCheckWrapper component={Component} /> : <Component />}
      </Show>
    </>
  );
}

function ProfileCheckWrapper({ component: Component }: { component: () => ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: profile, isLoading, isError } = useGetMyProfile({
    query: {
      queryKey: getGetMyProfileQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    // 404 means no profile yet — send to onboarding
    if (isError) {
      setLocation("/onboarding");
    }
  }, [isError, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return <Component />;
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
        signIn: {
          start: {
            title: "Kampüsnet'e Hoş Geldin",
            subtitle: ".edu.tr hesabınla giriş yap",
          },
        },
        signUp: {
          start: {
            title: "Kampüsnet'e Katıl",
            subtitle: "Üniversite e-postanla ücretsiz kayıt ol",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRoute} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/onboarding">
            <AuthGuard component={Onboarding} requireProfile={false} />
          </Route>
          <Route path="/feed">
            <AuthGuard component={Feed} requireProfile={true} />
          </Route>
          <Route path="/profile">
            <AuthGuard component={Profile} requireProfile={true} />
          </Route>
          <Route path="/profile/:userId">
            <AuthGuard component={UserProfile} requireProfile={true} />
          </Route>
          <Route component={NotFound} />
        </Switch>
        <Toaster />
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
