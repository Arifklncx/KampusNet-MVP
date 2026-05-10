import { useLocation, useParams } from "wouter";
import {
  useGetUserProfile,
  useGetPosts,
  getGetUserProfileQueryKey,
  getGetPostsQueryKey,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function UserProfile() {
  const params = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const userId = params.userId;

  const { data: profile, isLoading } = useGetUserProfile(userId, {
    query: { queryKey: getGetUserProfileQueryKey(userId) },
  });

  const { data: postsData } = useGetPosts(
    { filter: "all", limit: 100, offset: 0 },
    { query: { queryKey: getGetPostsQueryKey({ filter: "all", limit: 100, offset: 0 }) } }
  );

  const userPosts = postsData?.posts?.filter((p) => p.authorId === userId) ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="font-medium text-foreground">Kullanıcı bulunamadı</p>
          <button onClick={() => setLocation("/feed")} className="text-primary text-sm mt-2 hover:underline">
            Feed'e dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-card border border-border rounded-xl p-6 mb-4 animate-fade-in-up">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={profile.avatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {profile.firstName[0]}{profile.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-bold text-lg text-foreground" data-testid="text-full-name">
                {profile.firstName} {profile.lastName}
              </h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-xs mt-0.5">
                {profile.university}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {profile.department} · {profile.year}. Sınıf
              </p>
              {profile.bio && (
                <p className="text-sm text-foreground/80 mt-2">{profile.bio}</p>
              )}
              <div className="flex gap-4 mt-3">
                <span className="text-sm">
                  <strong>{profile.postCount}</strong>{" "}
                  <span className="text-muted-foreground">Gönderi</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <h2 className="font-semibold text-foreground mb-3">Gönderiler</h2>
        <div className="space-y-3">
          {userPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="empty-posts">
              <p>Henüz gönderi yok</p>
            </div>
          ) : (
            userPosts.map((post) => (
              <article
                key={post.id}
                className="bg-card border border-border rounded-xl p-4 animate-fade-in-up"
                data-testid={`post-card-${post.id}`}
              >
                <p className="text-sm text-foreground">{post.content}</p>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="" className="mt-2 rounded-lg max-h-48 w-full object-cover" />
                )}
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
