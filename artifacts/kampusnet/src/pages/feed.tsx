import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  useGetMyProfile,
  useGetPosts,
  useCreatePost,
  useLikePost,
  useUnlikePost,
  useDeletePost,
  useGetComments,
  useCreateComment,
  useDeleteComment,
  useGetFeedStats,
  useGetTrendingPosts,
  useGetNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useSearch,
  useGetTrendingHashtags,
  getGetPostsQueryKey,
  getGetFeedStatsQueryKey,
  getGetTrendingPostsQueryKey,
  getGetCommentsQueryKey,
  getGetMyProfileQueryKey,
  getGetNotificationsQueryKey,
  getGetTrendingHashtagsQueryKey,
  getSearchQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { MessageCircle } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type FilterType = "all" | "my_university";

/* ─── Icons ─── */
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "15px", height: "15px" }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "15px", height: "15px" }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" style={{ width: "17px", height: "17px" }}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "17px", height: "17px" }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BellIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "15px", height: "15px" }}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "15px", height: "15px" }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

/* ─── Search Overlay ─── */
function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(input.trim()), 320);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const enabled = debouncedQ.length >= 2;

  const { data, isFetching } = useSearch(
    { q: debouncedQ },
    { query: { queryKey: getSearchQueryKey({ q: debouncedQ }), enabled, staleTime: 10_000 } }
  );

  const users = data?.users ?? [];
  const posts = data?.posts ?? [];
  const hasResults = users.length > 0 || posts.length > 0;
  const showEmpty = enabled && !isFetching && !hasResults;

  function goToUser(clerkId: string) {
    setLocation(`/profile/${clerkId}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Search panel */}
      <div className="relative z-10 max-w-2xl w-full mx-auto mt-16 px-4">
        {/* Input row */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-xl">
          <span className="text-muted-foreground flex-shrink-0">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Gönderi veya öğrenci ara…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            data-testid="input-search"
          />
          {input && (
            <button onClick={() => setInput("")} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <XIcon />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground ml-1 font-medium flex-shrink-0"
          >
            İptal
          </button>
        </div>

        {/* Results panel */}
        {(enabled || isFetching) && (
          <div className="mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
            {isFetching && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {showEmpty && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                "<span className="font-medium text-foreground">{debouncedQ}</span>" için sonuç bulunamadı
              </div>
            )}

            {!isFetching && hasResults && (
              <>
                {users.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Öğrenciler</span>
                    </div>
                    {users.map((u) => (
                      <button
                        key={u.clerkId}
                        onClick={() => goToUser(u.clerkId)}
                        data-testid={`search-user-${u.clerkId}`}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                      >
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={u.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                            {u.firstName[0]}{u.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.university} · {u.department}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {posts.length > 0 && (
                  <div className={users.length > 0 ? "border-t border-border" : ""}>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gönderiler</span>
                    </div>
                    {posts.map((p) => (
                      <div
                        key={p.id}
                        data-testid={`search-post-${p.id}`}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors cursor-default"
                      >
                        <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                          <AvatarImage src={p.authorAvatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                            {p.authorName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <button
                              onClick={() => goToUser(p.authorId)}
                              className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate"
                            >
                              {p.authorName}
                            </button>
                            <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0 font-medium flex-shrink-0">
                              {p.authorUniversity}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground/90 leading-snug line-clamp-2 break-words">{p.content}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">{p.likeCount} beğeni</span>
                            <span className="text-xs text-muted-foreground">{p.commentCount} yorum</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: tr })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Notification Bell ─── */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useGetNotifications({
    query: {
      queryKey: getGetNotificationsQueryKey(),
      refetchInterval: 30_000,
    },
  });

  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function handleMarkAll() {
    await markAll.mutateAsync();
    qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
  }

  async function handleMarkOne(id: number) {
    await markOne.mutateAsync({ notificationId: id });
    qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() });
  }

  function label(type: string, actorName: string) {
    if (type === "like") return <><strong>{actorName}</strong> gönderini beğendi</>;
    if (type === "comment") return <><strong>{actorName}</strong> gönderine yorum yaptı</>;
    return <>{actorName} etkileşimde bulundu</>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="button-notifications"
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
          open ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-label="Bildirimler"
      >
        <BellIcon filled={unreadCount > 0} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-[3px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm text-foreground">Bildirimler</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-xs text-primary hover:underline font-medium"
                  data-testid="button-mark-all-read"
                >
                  Tümünü okundu işaretle
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Henüz bildirim yok
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) handleMarkOne(n.id); setOpen(false); }}
                    data-testid={`notification-${n.id}`}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/60 transition-colors ${
                      !n.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                      <AvatarImage src={n.actorAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {n.actorName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">
                        {label(n.type, n.actorName)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        "{n.postContent.slice(0, 60)}{n.postContent.length > 60 ? "…" : ""}"
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar({ firstName, lastName, avatarUrl }: { firstName: string; lastName: string; avatarUrl?: string | null }) {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => setLocation("/feed")} className="flex items-center gap-2.5" data-testid="link-logo">
            <img src={`${basePath}/logo.svg`} alt="Kampüsnet" className="w-7 h-7" />
            <span className="font-bold text-lg text-primary">Kampüsnet</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              data-testid="button-open-search"
              className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Ara"
            >
              <SearchIcon />
            </button>
            <button
              onClick={() => setLocation("/messages")}
              data-testid="link-messages"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
              aria-label="Mesajlar"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
            </button>
            <NotificationBell />
            <button
              onClick={() => setLocation("/profile")}
              data-testid="link-profile"
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Avatar className="w-7 h-7">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                  {firstName ? `${firstName[0]}${lastName[0]}` : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:block">
                {firstName} {lastName}
              </span>
            </button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => signOut()}
              data-testid="button-sign-out"
              className="text-muted-foreground hover:text-destructive text-sm"
            >
              Çıkış
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}

/* ─── Stats Bar ─── */
function StatsBar() {
  const { data: stats } = useGetFeedStats({ query: { queryKey: getGetFeedStatsQueryKey() } });
  if (!stats) return null;
  return (
    <div className="grid grid-cols-4 gap-0 rounded-xl border border-primary/15 bg-gradient-to-r from-primary/5 to-accent/30 overflow-hidden mb-4">
      {[
        { label: "Gönderi", value: stats.totalPosts },
        { label: "Öğrenci", value: stats.totalUsers },
        { label: "Üniversite", value: stats.totalUniversities },
        { label: "Bugün", value: stats.postsToday },
      ].map((s, i) => (
        <div key={s.label} className={`text-center py-3 ${i < 3 ? "border-r border-primary/10" : ""}`}>
          <div className="text-base font-bold text-primary">{s.value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Filter Toggle ─── */
function FilterToggle({
  filter,
  onChange,
  campusName,
}: {
  filter: FilterType;
  onChange: (f: FilterType) => void;
  campusName?: string;
}) {
  return (
    <div className="relative flex p-1 bg-muted rounded-xl border border-border mb-4">
      {/* sliding indicator */}
      <div
        className={`absolute inset-y-1 w-[calc(50%-2px)] bg-card rounded-lg shadow-sm border border-border transition-transform duration-200 ${
          filter === "all" ? "left-1 translate-x-0" : "left-1 translate-x-[calc(100%+2px)]"
        }`}
        style={{ pointerEvents: "none" }}
      />
      <button
        onClick={() => onChange("all")}
        data-testid="filter-all"
        className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
          filter === "all" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <GlobeIcon />
        Tüm Üniversiteler
      </button>
      <button
        onClick={() => onChange("my_university")}
        data-testid="filter-my-university"
        className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
          filter === "my_university" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <BuildingIcon />
        {campusName ? campusName.split(" ")[0] : "Kampüsüm"}
      </button>
    </div>
  );
}

/* ─── Create Post ─── */
function CreatePost() {
  const { data: profile } = useGetMyProfile({ query: { queryKey: getGetMyProfileQueryKey() } });
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [focused, setFocused] = useState(false);
  const createPost = useCreatePost();
  const qc = useQueryClient();
  const { toast } = useToast();

  async function submit() {
    if (!content.trim()) return;
    try {
      await createPost.mutateAsync({ data: { content: content.trim(), imageUrl: imageUrl || undefined } });
      setContent("");
      setImageUrl("");
      setShowImageInput(false);
      setFocused(false);
      qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFeedStatsQueryKey() });
    } catch {
      toast({ title: "Hata", description: "Gönderi paylaşılamadı.", variant: "destructive" });
    }
  }

  return (
    <div className={`bg-card border rounded-xl p-4 mb-4 transition-all duration-200 ${focused ? "border-primary/40 shadow-sm shadow-primary/10" : "border-border"}`}>
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0 mt-0.5">
          <AvatarImage src={profile?.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
            {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {!focused && !content ? (
            <button
              onClick={() => setFocused(true)}
              className="w-full text-left px-3 py-2.5 bg-muted rounded-lg text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              Kampüsünle ne paylaşmak istersin?
            </button>
          ) : (
            <>
              <Textarea
                autoFocus
                placeholder="Kampüsünle ne paylaşmak istersin?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={() => { if (!content) setFocused(false); }}
                rows={3}
                className="resize-none text-sm bg-muted border-0 focus-visible:ring-0 p-3"
                data-testid="textarea-create-post"
              />
              {showImageInput && (
                <input
                  type="url"
                  placeholder="Görsel URL'si"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-2 w-full px-3 py-2 text-sm border border-input rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  data-testid="input-image-url"
                />
              )}
              <div className="flex items-center justify-between mt-2.5">
                <button
                  type="button"
                  onClick={() => setShowImageInput((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${showImageInput ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  data-testid="button-toggle-image"
                >
                  <ImageIcon />
                  Görsel ekle
                </button>
                <div className="flex items-center gap-2">
                  {content.length > 0 && (
                    <span className={`text-xs ${content.length > 450 ? "text-destructive" : "text-muted-foreground"}`}>
                      {500 - content.length}
                    </span>
                  )}
                  <Button
                    size="sm"
                    onClick={submit}
                    disabled={createPost.isPending || !content.trim() || content.length > 500}
                    className="font-semibold text-sm px-4"
                    data-testid="button-submit-post"
                  >
                    {createPost.isPending ? (
                      <span className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Paylaşılıyor
                      </span>
                    ) : "Paylaş"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Comments ─── */
function PostComments({ postId, currentUserId }: { postId: number; currentUserId: string }) {
  const { data: comments, isLoading } = useGetComments(postId, {
    query: { queryKey: getGetCommentsQueryKey(postId) },
  });
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { toast } = useToast();

  async function submit() {
    if (!text.trim()) return;
    try {
      await createComment.mutateAsync({ postId, data: { content: text.trim() } });
      setText("");
      qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
    } catch {
      toast({ title: "Hata", description: "Yorum gönderilemedi.", variant: "destructive" });
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {isLoading ? (
        <div className="h-8 flex items-center">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5 animate-fade-in-up" data-testid={`comment-${c.id}`}>
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarImage src={c.authorAvatarUrl ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                {c.authorName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 bg-muted/60 rounded-lg px-3 py-2">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-foreground">{c.authorName}</span>
                <span className="text-xs text-muted-foreground">{c.authorUniversity}</span>
              </div>
              <p className="text-sm text-foreground/90 break-words mt-0.5">{c.content}</p>
            </div>
            {c.authorId === currentUserId && (
              <button
                onClick={() => {
                  deleteComment.mutateAsync({ commentId: c.id }).then(() => {
                    qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
                  });
                }}
                className="text-muted-foreground hover:text-destructive transition-colors text-xs self-start pt-2"
                data-testid={`button-delete-comment-${c.id}`}
              >
                Sil
              </button>
            )}
          </div>
        ))
      )}
      <div className="flex gap-2 pt-1">
        <Textarea
          rows={1}
          placeholder="Yorum yaz… (Enter ile gönder)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="resize-none text-sm min-h-[36px] py-2 bg-muted border-0 focus-visible:ring-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          data-testid={`textarea-comment-${postId}`}
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={createComment.isPending || !text.trim()}
          className="self-end"
          data-testid={`button-submit-comment-${postId}`}
        >
          Gönder
        </Button>
      </div>
    </div>
  );
}

/* ─── Post Card ─── */
function PostCard({
  post,
  currentUserId,
  onLike,
  onUnlike,
  onDelete,
}: {
  post: {
    id: number;
    content: string;
    imageUrl?: string | null;
    authorId: string;
    authorName: string;
    authorUniversity: string;
    authorDepartment: string;
    authorAvatarUrl?: string | null;
    likeCount: number;
    commentCount: number;
    liked: boolean;
    createdAt: string;
  };
  currentUserId: string;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [, setLocation] = useLocation();
  const [showComments, setShowComments] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  function handleLike() {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    post.liked ? onUnlike(post.id) : onLike(post.id);
  }

  return (
    <article
      className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
      data-testid={`post-card-${post.id}`}
    >
      <div className="flex items-start gap-3">
        <button onClick={() => setLocation(`/profile/${post.authorId}`)}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.authorAvatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
              {post.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <button
                onClick={() => setLocation(`/profile/${post.authorId}`)}
                className="font-semibold text-foreground hover:text-primary transition-colors text-sm leading-tight"
                data-testid={`link-author-${post.id}`}
              >
                {post.authorName}
              </button>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <Badge className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-0 font-medium">
                  {post.authorUniversity}
                </Badge>
                <span className="text-xs text-muted-foreground">{post.authorDepartment}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })}
                </span>
              </div>
            </div>
            {post.authorId === currentUserId && (
              <button
                onClick={() => onDelete(post.id)}
                className="text-muted-foreground hover:text-destructive transition-colors text-xs flex-shrink-0 mt-0.5"
                data-testid={`button-delete-post-${post.id}`}
              >
                Sil
              </button>
            )}
          </div>

          <p className="mt-2.5 text-sm text-foreground leading-relaxed break-words">{post.content}</p>

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="Post görseli"
              className="mt-3 rounded-lg border border-border max-h-80 w-full object-cover"
            />
          )}

          {/* Action Row */}
          <div className="flex items-center gap-1 mt-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                post.liked
                  ? "text-red-500 bg-red-50 hover:bg-red-100"
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-50"
              }`}
              data-testid={`button-like-${post.id}`}
            >
              <span className={likeAnim ? "animate-heart" : ""}>
                <HeartIcon filled={post.liked} />
              </span>
              <span data-testid={`like-count-${post.id}`}>{post.likeCount}</span>
            </button>
            <button
              onClick={() => setShowComments((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showComments
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
              data-testid={`button-comments-${post.id}`}
            >
              <CommentIcon />
              <span data-testid={`comment-count-${post.id}`}>{post.commentCount}</span>
            </button>
          </div>

          {showComments && <PostComments postId={post.id} currentUserId={currentUserId} />}
        </div>
      </div>
    </article>
  );
}

/* ─── Skeleton Loader ─── */
function PostSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-1/4" />
          <div className="h-2.5 bg-muted rounded w-1/3" />
          <div className="h-16 bg-muted rounded mt-3" />
          <div className="flex gap-2 mt-2">
            <div className="h-7 bg-muted rounded w-16" />
            <div className="h-7 bg-muted rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Trending Hashtags Sidebar ─── */
function TrendingHashtagsSidebar({
  activeTag,
  onTagClick,
}: {
  activeTag: string | null;
  onTagClick: (tag: string) => void;
}) {
  const { data: hashtags, isLoading } = useGetTrendingHashtags({
    query: { queryKey: getGetTrendingHashtagsQueryKey(), staleTime: 60_000 },
  });

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="h-3 bg-muted rounded w-2/3 mb-4 animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="h-2.5 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-2.5 bg-muted rounded w-8 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!hashtags || hashtags.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "14px", height: "14px" }} className="text-primary">
          <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
          <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
        </svg>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Trend Konular</span>
      </div>
      <div className="divide-y divide-border">
        {hashtags.map((h, i) => {
          const active = activeTag === h.tag;
          return (
            <button
              key={h.tag}
              onClick={() => onTagClick(h.tag)}
              data-testid={`hashtag-${h.tag}`}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors group ${
                active
                  ? "bg-primary/8 text-primary"
                  : "hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                <span className={`text-sm font-semibold truncate ${active ? "text-primary" : "group-hover:text-primary transition-colors"}`}>
                  #{h.tag}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                {h.count} {h.count === 1 ? "gönderi" : "gönderi"}
              </span>
            </button>
          );
        })}
      </div>
      {activeTag && (
        <div className="px-4 py-2.5 border-t border-border">
          <button
            onClick={() => onTagClick(activeTag)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            data-testid="clear-hashtag-filter"
          >
            <XIcon />
            Filtreyi temizle
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Feed Page ─── */
export default function Feed() {
  const { user } = useUser();
  const [filter, setFilter] = useState<FilterType>("all");
  const [hashtagFilter, setHashtagFilter] = useState<string | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: myProfile } = useGetMyProfile({ query: { queryKey: getGetMyProfileQueryKey() } });
  const { data: postsData, isLoading } = useGetPosts(
    { filter, limit: 30, offset: 0 },
    { query: { queryKey: getGetPostsQueryKey({ filter, limit: 30, offset: 0 }) } }
  );
  const { data: trending } = useGetTrendingPosts({
    query: { queryKey: getGetTrendingPostsQueryKey() },
  });

  function handleHashtagClick(tag: string) {
    setHashtagFilter((prev) => (prev === tag ? null : tag));
  }

  const allPosts = postsData?.posts ?? [];
  const filteredPosts = hashtagFilter
    ? allPosts.filter((p) =>
        new RegExp(`#${hashtagFilter}(?![a-zA-ZğüşıöçĞÜŞİÖÇ0-9_])`, "i").test(p.content)
      )
    : allPosts;

  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const deletePost = useDeletePost();

  const currentUserId = user?.id ?? "";

  type PostsData = { posts: typeof postsData extends { posts: infer P } | undefined ? P : never; total: number };

  function patchPost(postId: number, patch: (p: PostsData["posts"][number]) => PostsData["posts"][number]) {
    const activeKey = getGetPostsQueryKey({ filter, limit: 30, offset: 0 });
    qc.setQueryData<PostsData>(activeKey, (old) => {
      if (!old) return old;
      return { ...old, posts: old.posts.map((p) => (p.id === postId ? patch(p) : p)) };
    });
  }

  async function handleLike(postId: number) {
    patchPost(postId, (p) => ({ ...p, liked: true, likeCount: p.likeCount + 1 }));
    try {
      await likePost.mutateAsync({ postId });
    } catch {
      patchPost(postId, (p) => ({ ...p, liked: false, likeCount: Math.max(0, p.likeCount - 1) }));
    } finally {
      qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
    }
  }

  async function handleUnlike(postId: number) {
    patchPost(postId, (p) => ({ ...p, liked: false, likeCount: Math.max(0, p.likeCount - 1) }));
    try {
      await unlikePost.mutateAsync({ postId });
    } catch {
      patchPost(postId, (p) => ({ ...p, liked: true, likeCount: p.likeCount + 1 }));
    } finally {
      qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
    }
  }

  async function handleDelete(postId: number) {
    try {
      await deletePost.mutateAsync({ postId });
      qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFeedStatsQueryKey() });
      toast({ title: "Gönderi silindi" });
    } catch {
      toast({ title: "Hata", description: "Gönderi silinemedi.", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        firstName={myProfile?.firstName ?? ""}
        lastName={myProfile?.lastName ?? ""}
        avatarUrl={myProfile?.avatarUrl}
      />

      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex gap-6 items-start">

          {/* ── Main feed column ── */}
          <div className="flex-1 min-w-0">
            <StatsBar />
            <CreatePost />

            <FilterToggle
              filter={filter}
              onChange={setFilter}
              campusName={myProfile?.university}
            />

            {/* Hashtag filter banner */}
            {hashtagFilter && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/15 text-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "14px", height: "14px" }} className="text-primary flex-shrink-0">
                  <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
                  <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
                </svg>
                <span className="text-primary font-semibold">#{hashtagFilter}</span>
                <span className="text-muted-foreground text-xs">
                  — {filteredPosts.length} gönderi
                </span>
                <button
                  onClick={() => setHashtagFilter(null)}
                  className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="clear-hashtag-filter-banner"
                  aria-label="Filtreyi temizle"
                >
                  <XIcon />
                </button>
              </div>
            )}

            {/* My campus banner when filtered */}
            {!hashtagFilter && filter === "my_university" && myProfile?.university && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/15 text-sm">
                <BuildingIcon />
                <span className="text-primary font-medium">{myProfile.university}</span>
                <span className="text-muted-foreground ml-auto text-xs">kampüs görünümü</span>
              </div>
            )}

            {/* Trending strip (only when no hashtag filter active) */}
            {!hashtagFilter && trending && trending.length > 0 && filter === "all" && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingIcon />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Trend</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {trending.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex-shrink-0 w-44 bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-colors cursor-default">
                      <p className="text-xs text-foreground line-clamp-2 mb-2 leading-relaxed">{p.content}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground font-semibold">{p.likeCount} beğeni</span>
                        <span className="text-xs text-muted-foreground">· {p.authorUniversity.split(" ")[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts list */}
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
              ) : filteredPosts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground animate-fade-in-up" data-testid="empty-feed">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <CommentIcon />
                  </div>
                  <p className="font-semibold text-foreground">
                    {hashtagFilter ? `#${hashtagFilter} etiketiyle gönderi yok` : "Henüz gönderi yok"}
                  </p>
                  <p className="text-sm mt-1">
                    {hashtagFilter
                      ? "Bu konuda henüz bir şey paylaşılmamış."
                      : filter === "my_university"
                      ? "Kampüsünden henüz paylaşım yok. İlk sen paylaş!"
                      : "İlk paylaşımı sen yap!"}
                  </p>
                </div>
              ) : (
                filteredPosts.map((post, i) => (
                  <div
                    key={post.id}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i * 40, 160)}ms`, animationFillMode: "both", opacity: 0 }}
                  >
                    <PostCard
                      post={{ ...post, authorDepartment: post.authorDepartment ?? "" }}
                      currentUserId={currentUserId}
                      onLike={handleLike}
                      onUnlike={handleUnlike}
                      onDelete={handleDelete}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              <TrendingHashtagsSidebar
                activeTag={hashtagFilter}
                onTagClick={handleHashtagClick}
              />
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
