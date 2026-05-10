import { useState } from "react";
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
  getGetPostsQueryKey,
  getGetFeedStatsQueryKey,
  getGetTrendingPostsQueryKey,
  getGetCommentsQueryKey,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

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

/* ─── Navbar ─── */
function Navbar({ firstName, lastName, avatarUrl }: { firstName: string; lastName: string; avatarUrl?: string | null }) {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <button onClick={() => setLocation("/feed")} className="flex items-center gap-2.5" data-testid="link-logo">
          <img src={`${basePath}/logo.svg`} alt="Kampüsnet" className="w-7 h-7" />
          <span className="font-bold text-lg text-primary">Kampüsnet</span>
        </button>
        <div className="flex items-center gap-2">
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

/* ─── Feed Page ─── */
export default function Feed() {
  const { user } = useUser();
  const [filter, setFilter] = useState<FilterType>("all");
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

  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const deletePost = useDeletePost();

  const currentUserId = user?.id ?? "";

  async function handleLike(postId: number) {
    await likePost.mutateAsync({ postId });
    qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
  }

  async function handleUnlike(postId: number) {
    await unlikePost.mutateAsync({ postId });
    qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
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

      <div className="max-w-2xl mx-auto px-4 py-5">
        <StatsBar />
        <CreatePost />

        <FilterToggle
          filter={filter}
          onChange={setFilter}
          campusName={myProfile?.university}
        />

        {/* My campus banner when filtered */}
        {filter === "my_university" && myProfile?.university && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-primary/5 rounded-lg border border-primary/15 text-sm">
            <BuildingIcon />
            <span className="text-primary font-medium">{myProfile.university}</span>
            <span className="text-muted-foreground ml-auto text-xs">kampüs görünümü</span>
          </div>
        )}

        {/* Trending strip */}
        {trending && trending.length > 0 && filter === "all" && (
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
                    <span className="text-xs text-red-500 font-semibold">♥ {p.likeCount}</span>
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
          ) : postsData?.posts?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground animate-fade-in-up" data-testid="empty-feed">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <CommentIcon />
              </div>
              <p className="font-semibold text-foreground">Henüz gönderi yok</p>
              <p className="text-sm mt-1">
                {filter === "my_university"
                  ? "Kampüsünden henüz paylaşım yok. İlk sen paylaş!"
                  : "İlk paylaşımı sen yap!"}
              </p>
            </div>
          ) : (
            postsData?.posts?.map((post, i) => (
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
    </div>
  );
}
