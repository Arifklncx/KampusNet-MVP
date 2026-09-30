import { useState } from "react";
import { useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  getGetFeedStatsQueryKey,
  getGetMyProfileQueryKey,
  getGetPostsQueryKey,
  getGetUserPostsQueryKey,
  useDeletePost,
  useGetMyProfile,
  useGetUserPosts,
  useUpsertMyProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, MessageCircle, PencilLine, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: profile, isLoading, isError, refetch } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() },
  });
  const userId = user?.id ?? "";
  const postsQuery = useGetUserPosts(userId, {
    query: { queryKey: getGetUserPostsQueryKey(userId), enabled: Boolean(userId) },
  });
  const deletePost = useDeletePost();
  const upsert = useUpsertMyProfile();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    university: "",
    department: "",
    year: 1,
    bio: "",
  });
  const myPosts = postsQuery.data ?? [];

  function startEditing() {
    setForm({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      university: profile?.university ?? "",
      department: profile?.department ?? "",
      year: profile?.year ?? 1,
      bio: profile?.bio ?? "",
    });
    setEditing(true);
  }

  async function saveProfile() {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.university.trim() || !form.department.trim()) {
      toast({ title: "Eksik bilgi", description: "Ad, soyad, üniversite ve bölüm alanlarını doldur.", variant: "destructive" });
      return;
    }
    try {
      await upsert.mutateAsync({
        data: { ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), university: form.university.trim(), department: form.department.trim(), bio: form.bio.trim() },
      });
      await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      setEditing(false);
      toast({ title: "Profil güncellendi" });
    } catch {
      toast({ title: "Hata", description: "Profil güncellenemedi.", variant: "destructive" });
    }
  }

  async function handleDeletePost(postId: number) {
    if (!window.confirm("Bu gönderiyi silmek istediğine emin misin?")) return;
    try {
      await deletePost.mutateAsync({ postId });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: getGetPostsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetFeedStatsQueryKey() }),
      ]);
      toast({ title: "Gönderi silindi" });
    } catch {
      toast({ title: "Hata", description: "Gönderi silinemedi.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <ProfileHeader onBack={() => setLocation("/feed")} onMessages={() => setLocation("/messages")} />
        <main className="mx-auto max-w-3xl animate-pulse px-4 py-8">
          <div className="h-52 rounded-2xl bg-muted" />
          <div className="mt-7 h-5 w-36 rounded bg-muted" />
          <div className="mt-4 h-28 rounded-2xl bg-muted" />
        </main>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <ProfileHeader onBack={() => setLocation("/feed")} onMessages={() => setLocation("/messages")} />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center" data-testid="status-profile-error">
          <h1 className="text-lg font-semibold text-foreground">Profil yüklenemedi</h1>
          <p className="mt-2 text-sm text-muted-foreground">Bağlantını kontrol edip yeniden deneyebilirsin.</p>
          <Button variant="outline" className="mt-5" onClick={() => refetch()} data-testid="button-retry-profile">Yeniden dene</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <ProfileHeader onBack={() => setLocation("/feed")} onMessages={() => setLocation("/messages")} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
        <div className="mb-5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Öğrenci profilin
        </div>
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" data-testid="profile-card">
          <div className="h-24 bg-[linear-gradient(115deg,hsl(var(--primary)/.12),hsl(var(--accent)),hsl(var(--background)))] sm:h-32" />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-12">
              <Avatar className="h-20 w-20 border-4 border-card shadow-sm sm:h-24 sm:w-24">
                <AvatarImage src={profile.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">{profile.firstName[0]}{profile.lastName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex gap-2 pb-1">
                <Button variant="outline" size="sm" onClick={() => setLocation("/messages")} data-testid="button-open-messages">
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Mesajlar</span>
                </Button>
                {!editing && (
                  <Button size="sm" onClick={startEditing} data-testid="button-edit-profile">
                    <PencilLine className="mr-1.5 h-4 w-4" />
                    Düzenle
                  </Button>
                )}
              </div>
            </div>

            {editing ? (
              <div className="mt-5 space-y-4" data-testid="profile-edit-form">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                    Ad
                    <Input value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} data-testid="input-first-name" />
                  </label>
                  <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
                    Soyad
                    <Input value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} data-testid="input-last-name" />
                  </label>
                </div>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  Üniversite
                  <Input value={form.university} onChange={(event) => setForm((current) => ({ ...current, university: event.target.value }))} data-testid="input-university" />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  Bölüm
                  <Input value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} data-testid="input-department" />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  Sınıf
                  <Select value={String(form.year)} onValueChange={(value) => setForm((current) => ({ ...current, year: Number(value) }))}>
                    <SelectTrigger data-testid="select-year"><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3, 4, 5, 6, 7, 8].map((year) => <SelectItem key={year} value={String(year)}>{year}. Sınıf</SelectItem>)}</SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  Hakkımda
                  <Textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} rows={3} maxLength={300} placeholder="Kendinden kısaca bahset..." data-testid="textarea-bio" />
                </label>
                <div className="flex gap-2 pt-1">
                  <Button onClick={saveProfile} disabled={upsert.isPending} data-testid="button-save-profile">{upsert.isPending ? "Kaydediliyor..." : "Değişiklikleri kaydet"}</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} data-testid="button-cancel-edit">İptal</Button>
                </div>
              </div>
            ) : (
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
                {profile.bio ? <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">{profile.bio}</p> : <p className="mt-4 text-sm text-muted-foreground">Henüz bir bio eklemedin.</p>}
                <div className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm" data-testid="text-post-count">
                  <strong className="text-foreground">{myPosts.length}</strong>
                  <span className="text-muted-foreground">gönderi</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Arşivin</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Gönderilerin</h2>
            </div>
            <span className="text-xs text-muted-foreground">{postsQuery.isLoading ? "Yükleniyor" : `${myPosts.length} paylaşım`}</span>
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
          ) : myPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center" data-testid="empty-posts">
              <p className="font-semibold text-foreground">Henüz gönderi yok</p>
              <p className="mt-1 text-sm text-muted-foreground">Kampüsünden bir şeyler paylaşmaya ne dersin?</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setLocation("/feed")} data-testid="button-go-to-feed">Akışa git</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myPosts.map((post) => (
                <article key={post.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" data-testid={`post-card-${post.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>
                    <button onClick={() => handleDeletePost(post.id)} disabled={deletePost.isPending} aria-label="Gönderiyi sil" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" data-testid={`button-delete-post-${post.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
        <div className="mt-8 border-t border-border pt-4 text-right">
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-xs text-muted-foreground hover:text-destructive" data-testid="button-sign-out">Çıkış yap</Button>
        </div>
      </main>
    </div>
  );
}

function ProfileHeader({ onBack, onMessages }: { onBack: () => void; onMessages: () => void }) {
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