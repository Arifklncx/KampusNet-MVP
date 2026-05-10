import { useState } from "react";
import { useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  useGetMyProfile,
  useUpsertMyProfile,
  useGetPosts,
  useDeletePost,
  getGetMyProfileQueryKey,
  getGetPostsQueryKey,
  getGetFeedStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
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
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() },
  });

  const { data: postsData } = useGetPosts(
    { filter: "all", limit: 100, offset: 0 },
    { query: { queryKey: getGetPostsQueryKey({ filter: "all", limit: 100, offset: 0 }) } }
  );

  const deletePost = useDeletePost();
  const upsert = useUpsertMyProfile();

  const myPosts = postsData?.posts?.filter((p) => p.authorId === user?.id) ?? [];

  const [form, setForm] = useState({
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    university: profile?.university ?? "",
    department: profile?.department ?? "",
    year: profile?.year ?? 1,
    bio: profile?.bio ?? "",
  });

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
    try {
      await upsert.mutateAsync({ data: form });
      await qc.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      setEditing(false);
      toast({ title: "Profil güncellendi" });
    } catch {
      toast({ title: "Hata", description: "Profil güncellenemedi.", variant: "destructive" });
    }
  }

  async function handleDeletePost(postId: number) {
    try {
      await deletePost.mutateAsync({ postId });
      qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFeedStatsQueryKey() });
      toast({ title: "Gönderi silindi" });
    } catch {
      toast({ title: "Hata", description: "Gönderi silinemedi.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => setLocation("/feed")} className="text-muted-foreground hover:text-foreground" data-testid="link-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "20px", height: "20px" }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src={`${basePath}/logo.svg`} alt="Kampüsnet" className="w-6 h-6" />
            <span className="font-bold text-primary">Kampüsnet</span>
          </div>
          <div className="ml-auto">
            <Button size="sm" variant="outline" onClick={() => signOut()} data-testid="button-sign-out">
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-xl p-6 mb-4 animate-fade-in-up">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Ad</label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Soyad</label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Üniversite</label>
                <Input
                  value={form.university}
                  onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
                  data-testid="input-university"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bölüm</label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  data-testid="input-department"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Sınıf</label>
                <Select value={String(form.year)} onValueChange={(v) => setForm((f) => ({ ...f, year: Number(v) }))}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}. Sınıf</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  placeholder="Kendini tanıt..."
                  data-testid="textarea-bio"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveProfile} disabled={upsert.isPending} size="sm" data-testid="button-save-profile">
                  {upsert.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} size="sm" data-testid="button-cancel-edit">
                  İptal
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="font-bold text-lg text-foreground" data-testid="text-full-name">
                      {profile?.firstName} {profile?.lastName}
                    </h1>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs mt-0.5">
                      {profile?.university}
                    </Badge>
                  </div>
                  <Button size="sm" variant="outline" onClick={startEditing} data-testid="button-edit-profile">
                    Düzenle
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{profile?.department} · {profile?.year}. Sınıf</p>
                {profile?.bio && (
                  <p className="text-sm text-foreground/80 mt-2">{profile.bio}</p>
                )}
                <div className="flex gap-4 mt-3">
                  <span className="text-sm" data-testid="text-post-count">
                    <strong>{myPosts.length}</strong> <span className="text-muted-foreground">Gönderi</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Posts */}
        <h2 className="font-semibold text-foreground mb-3">Gönderilerin</h2>
        <div className="space-y-3">
          {myPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="empty-posts">
              <p className="font-medium">Henüz gönderi yok</p>
              <p className="text-sm mt-1">
                <button onClick={() => setLocation("/feed")} className="text-primary hover:underline">
                  Feed'e git ve ilk paylaşımı yap
                </button>
              </p>
            </div>
          ) : (
            myPosts.map((post) => (
              <article
                key={post.id}
                className="bg-card border border-border rounded-xl p-4"
                data-testid={`post-card-${post.id}`}
              >
                <div className="flex justify-between gap-2">
                  <p className="text-sm text-foreground flex-1">{post.content}</p>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors text-xs flex-shrink-0"
                    data-testid={`button-delete-post-${post.id}`}
                  >
                    Sil
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{post.likeCount} beğeni</span>
                  <span>{post.commentCount} yorum</span>
                  <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
