import { useLocation, useParams } from "wouter";
import { useUser } from "@clerk/react";
import {
  getGetUserPostsQueryKey,
  getGetUserProfileQueryKey,
  useGetUserPosts,
  useGetUserProfile,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, MessageCircle, PencilLine, ShieldCheck } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function UserProfile() {
  const params = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const userId = params.userId ?? "";
  const isOwnProfile = user?.id === userId;
  const profileQuery = useGetUserProfile(userId, {
    query: { queryKey: getGetUserProfileQueryKey(userId), enabled: Boolean(userId) },
  });
  const postsQuery = useGetUserPosts(userId, {
    query: { queryKey: getGetUserPostsQueryKey(userId), enabled: Boolean(userId) },
  });
  const profile = profileQuery.data;
  const userPosts = postsQuery.data ?? [];

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <UserProfileHeader onBack={() => setLocation("/feed")} onMessages={() => setLocation("/messages")} />
        <main className="mx-auto max-w-3xl animate-pulse px-4 py-8">
          <div className="h-52 rounded-2xl bg-muted" />
          <div className="mt-7 h-5 w-36 rounded bg-muted" />
          <div className="mt-4 h-32 rounded-2xl bg-muted" />
        </main>
      </div>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <UserProfileHeader onBack={() => setLocation("/feed")} onMessages={() => setLocation("/messages")} />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center" data-testid="status-user-profile-error">
          <h1 className="text-lg font-semibold text-foreground">Öğrenci profili bulunamadı</h1>
          <p className="mt-2 text-sm text-muted-foreground">Bağlantıyı kontrol et veya akışa geri dön.</p>
          <Button variant="outline" className="mt-5" onClick={() => setLocation("/feed")} data-testid="button-back-to-feed">Akışa dön</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <UserProfileHeader onBack={() => setLocation("/feed")} onMessages={() => setLocation(`/messages/${userId}`)} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Öğrenci profili
        </div>
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="public-profile-card">
          <div className="h-24 bg-[linear-gradient(115deg,hsl(var(--primary)/.12),hsl(var(--accent)),hsl(var(--background)))] sm:h-32" />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-12">
              <Avatar className="h-20 w-20 border-4 border-card shadow-sm sm:h-24 sm:w-24">
                <AvatarImage src={profile.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">{profile.firstName[0]}{profile.lastName[0]}</AvatarFallback>
              </Avatar>
              <Button
                onClick={() => setLocation(isOwnProfile ? "/profile" : `/messages/${userId}`)}
                className="mb-1"
                variant={isOwnProfile ? "outline" : "default"}
                data-testid={isOwnProfile ? "button-edit-own-profile" : "button-send-message"}
              >
                {isOwnProfile ? <PencilLine className="mr-2 h-4 w-4" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                {isOwnProfile ? "Profili düzenle" : "Mesaj gönder"}
              </Button>
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-full-name">{profile.firstName} {profile.lastName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Doğrulanmış öğrenci
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="border-0 bg-primary/10 text-primary">{profile.university}</Badge>
                <span className="text-sm text-muted-foreground">{profile.department} · {profile.year}. Sınıf</span>
              </div>
              {profile.bio ? <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{profile.bio}</p> : null}
              <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm">
                <strong className="text-foreground" data-testid="text-post-count">{profile.postCount ?? userPosts.length}</strong>
                <span className="text-muted-foreground">gönderi</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Paylaşımlar</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Gönderiler</h2>
            </div>
            <span className="text-xs text-muted-foreground">{postsQuery.isLoading ? "Yükleniyor" : `${userPosts.length} paylaşım`}</span>
          </div>
          {postsQuery.isLoading ? (
            <div className="space-y-3" aria-label="Gönderiler yükleniyor">
              {[0, 1].map((index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : postsQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-card p-6 text-center" data-testid="status-posts-error">
              <p className="text-sm font-medium text-foreground">Gönderiler yüklenemedi</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => postsQuery.refetch()} data-testid="button-retry-posts">Yeniden dene</Button>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center" data-testid="empty-posts">
              <p className="font-semibold text-foreground">Henüz gönderi yok</p>
              <p className="mt-1 text-sm text-muted-foreground">Bu öğrencinin paylaşımları burada görünecek.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userPosts.map((post) => (
                <article key={post.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" data-testid={`post-card-${post.id}`}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>
                  {post.imageUrl && <img src={post.imageUrl} alt="" className="mt-4 max-h-80 w-full rounded-xl object-cover" />}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{post.likeCount} beğeni</span>
                    <span>{post.commentCount} yorum</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function UserProfileHeader({ onBack, onMessages }: { onBack: () => void; onMessages: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Akışa dön" data-testid="link-back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button onClick={onBack} className="flex items-center gap-2" data-testid="link-logo">
          <img src={`${basePath}/logo.svg`} alt="" className="h-6 w-6" />
          <span className="font-bold text-primary">Kampüsnet</span>
        </button>
        <button onClick={onMessages} className="ml-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary" data-testid="link-messages">
          <MessageCircle className="h-4 w-4" />
          Mesajlar
        </button>
      </div>
    </header>
  );
}