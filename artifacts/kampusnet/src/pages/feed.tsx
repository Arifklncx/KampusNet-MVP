import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
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

function Navbar({ profileName }: { profileName: string }) {
  const [, setLocation] = useLocation();
  const { signOut } = useUser().user ?? {};

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setLocation("/feed")}
          className="flex items-center gap-2"
          data-testid="link-logo"
        >
          <img src={`${basePath}/logo.svg`} alt="Kampüsnet" className="w-7 h-7" />
          <span className="font-bold text-lg text-primary">Kampüsnet</span>
        </button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLocation("/profile")}
            data-testid="link-profile"
            className="text-sm"
          >
            {profileName || "Profil"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => signOut?.()}
            data-testid="button-sign-out"
            className="text-sm"
          >
            Çıkış
          </Button>
        </div>
      </div>
    </header>
  );
}

function StatsBar() {
  const { data: stats } = useGetFeedStats({ query: { queryKey: getGetFeedStatsQueryKey() } });
  if (!stats) return null;
  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-primary/5 rounded-xl border border-primary/10 mb-4">
      {[
        { label: "Gönderi", value: stats.totalPosts },
        { label: "Öğrenci", value: stats.totalUsers },
        { label: "Üniversite", value: stats.totalUniversities },
        { label: "Bugün", value: stats.postsToday },
      ].map((s) => (
        <div key={s.label} className="text-center" data-testid={`stat-${s.label.toLowerCase()}`}>
          <div className="text-lg font-bold text-primary">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

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

  async function handleDelete(commentId: number) {
    await deleteComment.mutateAsync({ commentId });
    qc.invalidateQueries({ queryKey: getGetCommentsQueryKey(postId) });
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {isLoading ? (
        <div className="h-8 flex items-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        comments?.map((c) => (
          <div key={c.id} className="flex gap-2.5 animate-fade-in-up" data-testid={`comment-${c.id}`}>
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarImage src={c.authorAvatarUrl ?? undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {c.authorName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">{c.authorName}</span>
                <span className="text-xs text-muted-foreground truncate">{c.authorUniversity}</span>
              </div>
              <p className="text-sm text-foreground/90 break-words">{c.content}</p>
            </div>
            {c.authorId === currentUserId && (
              <button
                onClick={() => handleDelete(c.id)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 text-xs mt-0.5"
                data-testid={`button-delete-comment-${c.id}`}
              >
                Sil
              </button>
            )}
          </div>
        ))
      )}
      <div className="flex gap-2">
        <Textarea
          rows={1}
          placeholder="Yorum yaz..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="resize-none text-sm min-h-[36px] py-2"
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
          data-testid={`button-submit-comment-${postId}`}
        >
          Gönder
        </Button>
      </div>
    </div>
  );
}

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

  function handleLikeClick() {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    if (post.liked) {
      onUnlike(post.id);
    } else {
      onLike(post.id);
    }
  }

  return (
    <article
      className="bg-card border border-border rounded-xl p-4 animate-fade-in-up"
      data-testid={`post-card-${post.id}`}
    >
      <div className="flex items-start gap-3">
        <button onClick={() => setLocation(`/profile/${post.authorId}`)}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.authorAvatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {post.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <button
                onClick={() => setLocation(`/profile/${post.authorId}`)}
                className="font-semibold text-foreground hover:text-primary transition-colors text-sm"
                data-testid={`link-author-${post.id}`}
              >
                {post.authorName}
              </button>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-primary/10 text-primary border-0">
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
                className="text-muted-foreground hover:text-destructive transition-colors text-xs flex-shrink-0"
                data-testid={`button-delete-post-${post.id}`}
              >
                Sil
              </button>
            )}
          </div>
          <p className="mt-2 text-sm text-foreground leading-relaxed break-words">{post.content}</p>
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="Post görseli"
              className="mt-3 rounded-lg border border-border max-h-80 w-full object-cover"
            />
          )}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={handleLikeClick}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                post.liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
              data-testid={`button-like-${post.id}`}
            >
              <svg
                viewBox="0 0 24 24"
                fill={post.liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                className={`w-4.5 h-4.5 ${likeAnim ? "animate-heart" : ""}`}
                style={{ width: "18px", height: "18px" }}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span data-testid={`like-count-${post.id}`}>{post.likeCount}</span>
            </button>
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
              data-testid={`button-comments-${post.id}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span data-testid={`comment-count-${post.id}`}>{post.commentCount}</span>
            </button>
          </div>
          {showComments && <PostComments postId={post.id} currentUserId={currentUserId} />}
        </div>
      </div>
    </article>
  );
}

function CreatePost({ currentUserId }: { currentUserId: string }) {
  const { data: profile } = useGetMyProfile({ query: { queryKey: getGetMyProfileQueryKey() } });
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
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
      qc.invalidateQueries({ queryKey: getGetPostsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetFeedStatsQueryKey() });
    } catch {
      toast({ title: "Hata", description: "Gönderi paylaşılamadı.", variant: "destructive" });
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          <AvatarImage src={profile?.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {profile ? `${profile.firstName[0]}${profile.lastName[0]}` : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Kampüsünle ne paylaşmak istersin?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none text-sm"
            data-testid="textarea-create-post"
          />
          {showImageInput && (
            <input
              type="url"
              placeholder="Görsel URL'si (isteğe bağlı)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-2 w-full px-3 py-2 text-sm border border-input rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="input-image-url"
            />
          )}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setShowImageInput((v) => !v)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
              data-testid="button-toggle-image"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "16px", height: "16px" }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Görsel ekle
            </button>
            <Button
              size="sm"
              onClick={submit}
              disabled={createPost.isPending || !content.trim()}
              className="font-semibold"
              data-testid="button-submit-post"
            >
              {createPost.isPending ? "Paylaşılıyor..." : "Paylaş"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      <Navbar profileName={myProfile ? `${myProfile.firstName} ${myProfile.lastName}` : ""} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <StatsBar />

        <CreatePost currentUserId={currentUserId} />

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
            data-testid="filter-all"
          >
            Tüm Üniversiteler
          </button>
          <button
            onClick={() => setFilter("my_university")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              filter === "my_university"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
            data-testid="filter-my-university"
          >
            Kendi Üniversitem
          </button>
        </div>

        {/* Trending strip */}
        {trending && trending.length > 0 && filter === "all" && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-primary">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <span className="text-sm font-semibold text-foreground">Trend Gönderiler</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {trending.slice(0, 5).map((p) => (
                <div key={p.id} className="flex-shrink-0 w-48 bg-card border border-border rounded-lg p-3">
                  <p className="text-xs text-foreground line-clamp-2 mb-1.5">{p.content}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-red-500">{p.likeCount} beğeni</span>
                    <span className="text-xs text-muted-foreground">· {p.authorUniversity.split(" ")[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-12 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : postsData?.posts?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground" data-testid="empty-feed">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-3 opacity-40">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p className="font-medium">Henüz gönderi yok</p>
              <p className="text-sm mt-1">İlk paylaşımı sen yap!</p>
            </div>
          ) : (
            postsData?.posts?.map((post, i) => (
              <div key={post.id} className={`stagger-${Math.min(i + 1, 4)}`}>
                <PostCard
                  post={post}
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
