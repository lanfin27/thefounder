'use client';

import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, X, Search, Save, Eye, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// Types for Topics
interface Topic {
  topic_name: string;
  post_count: number;
  is_featured?: boolean;
  display_order?: number;
}

interface FeaturedTopic {
  topic_name: string;
  display_order: number;
}

// Types for Founder Picks
interface FounderPickPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  reading_time: number;
  cover?: string;
  summary?: string;
  is_featured?: boolean;
  display_order?: number;
}

interface FeaturedPick {
  post_id: string;
  display_order: number;
  post?: FounderPickPost;
}

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  image_url?: string;
}

interface HomepageConfig {
  config_type: 'featured' | 'founder_picks' | 'topics';
  selected_posts: Post[];
  display_order: number[];
}

// Draggable Post Card Component
function SortablePostCard({ post, onRemove }: { post: Post; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        type="button"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </button>

      {post.image_url && (
        <img
          src={post.image_url}
          alt={post.title}
          className="w-16 h-16 object-cover rounded"
        />
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate text-gray-900">{post.title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{post.category}</p>
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.excerpt}</p>
      </div>

      <button
        onClick={onRemove}
        className="p-2 hover:bg-red-50 rounded transition-colors"
        type="button"
      >
        <X className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}

// Post Selection Modal Component
function PostSelectionModal({
  isOpen,
  onClose,
  onSelect,
  maxPosts,
  currentPosts
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (post: Post) => void;
  maxPosts: number;
  currentPosts: Post[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPosts();
    }
  }, [isOpen, searchQuery]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/homepage/posts/search?q=${encodeURIComponent(searchQuery)}&limit=50`
      );
      const result = await response.json();
      if (result.success) {
        setPosts(result.data);
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const isSelected = (postId: string) =>
    currentPosts.some(p => p.id === postId);

  const canAddMore = currentPosts.length < maxPosts;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col z-50">
          <Dialog.Title className="text-lg font-semibold p-6 border-b">
            포스트 선택 ({currentPosts.length}/{maxPosts})
          </Dialog.Title>

          <div className="p-6 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목으로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                로딩 중...
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                검색 결과가 없습니다
              </div>
            ) : (
              posts.map(post => (
                <button
                  key={post.id}
                  onClick={() => {
                    if (!isSelected(post.id) && canAddMore) {
                      onSelect(post);
                      onClose();
                    }
                  }}
                  disabled={isSelected(post.id) || !canAddMore}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${isSelected(post.id)
                    ? 'bg-green-50 border-green-500'
                    : canAddMore
                      ? 'hover:bg-gray-50 border-gray-200'
                      : 'opacity-50 cursor-not-allowed border-gray-200'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{post.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">{post.category}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.excerpt}</p>
                    </div>
                    {isSelected(post.id) && (
                      <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                        선택됨
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              닫기
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Section Manager Component
function SectionManager({
  title,
  description,
  configType,
  maxPosts,
  posts,
  onUpdate
}: {
  title: string;
  description: string;
  configType: string;
  maxPosts: number;
  posts: Post[];
  onUpdate: (posts: Post[]) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = posts.findIndex(p => p.id === active.id);
      const newIndex = posts.findIndex(p => p.id === over.id);

      onUpdate(arrayMove(posts, oldIndex, newIndex));
    }
  };

  const handleRemove = (postId: string) => {
    onUpdate(posts.filter(p => p.id !== postId));
  };

  const handleSelect = (post: Post) => {
    if (posts.length < maxPosts && !posts.some(p => p.id === post.id)) {
      onUpdate([...posts, post]);
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
          <p className="text-xs text-gray-400 mt-1">
            {posts.length}/{maxPosts} 선택됨
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={posts.length >= maxPosts}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${posts.length >= maxPosts
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-green-primary text-white hover:bg-green-hover'
            }`}
        >
          <Plus className="w-4 h-4" />
          포스트 추가
        </button>
      </div>

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={posts.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <Plus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>포스트를 추가해주세요</p>
              </div>
            ) : (
              posts.map(post => (
                <SortablePostCard
                  key={post.id}
                  post={post}
                  onRemove={() => handleRemove(post.id)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      <PostSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
        maxPosts={maxPosts}
        currentPosts={posts}
      />
    </div>
  );
}

// Topics Manager Component
function TopicsManager() {
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [featuredTopics, setFeaturedTopics] = useState<FeaturedTopic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/admin/featured-topics');
      if (response.ok) {
        const data = await response.json();
        setAllTopics(data.all_topics || []);
        setFeaturedTopics(
          (data.featured_topics || []).map((t: any) => ({
            topic_name: t.topic_name,
            display_order: t.display_order
          }))
        );
      } else if (response.status === 403) {
        setMessage({ type: 'error', text: 'Admin 권한이 필요합니다.' });
      }
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = featuredTopics.findIndex(t => t.topic_name === active.id);
      const newIndex = featuredTopics.findIndex(t => t.topic_name === over.id);

      const reordered = arrayMove(featuredTopics, oldIndex, newIndex);
      const updated = reordered.map((topic, index) => ({
        ...topic,
        display_order: index + 1
      }));

      setFeaturedTopics(updated);
    }
  };

  const addTopic = (topicName: string) => {
    if (featuredTopics.length >= 8) {
      setMessage({ type: 'error', text: '최대 8개까지만 선택할 수 있습니다.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (featuredTopics.some(t => t.topic_name === topicName)) {
      setMessage({ type: 'error', text: '이미 추가된 토픽입니다.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setFeaturedTopics([
      ...featuredTopics,
      { topic_name: topicName, display_order: featuredTopics.length + 1 }
    ]);
    setMessage(null);
  };

  const removeTopic = (topicName: string) => {
    const updated = featuredTopics
      .filter(t => t.topic_name !== topicName)
      .map((topic, index) => ({
        ...topic,
        display_order: index + 1
      }));
    setFeaturedTopics(updated);
  };

  const saveFeaturedTopics = async () => {
    if (featuredTopics.length === 0) {
      setMessage({ type: 'error', text: '최소 1개 이상의 토픽을 선택해주세요.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const topics = featuredTopics.map(topic => ({
        name: topic.topic_name,
        order: topic.display_order
      }));

      const response = await fetch('/api/admin/featured-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics }),
        credentials: 'include'
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Featured topics가 저장되었습니다!' });
        await fetchTopics();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: `❌ 저장 실패: ${data.error}` });
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: '❌ 저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredAllTopics = searchQuery
    ? allTopics.filter(topic =>
      topic.topic_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : allTopics;

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-green-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Topics</h2>
          <p className="text-sm text-gray-500 mt-1">
            오른쪽 사이드바의 'Topics' 섹션 (최대 8개)
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {featuredTopics.length}/8 선택됨
          </p>
        </div>
        <button
          onClick={saveFeaturedTopics}
          disabled={saving || featuredTopics.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${saving || featuredTopics.length === 0
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-green-primary text-white hover:bg-green-hover'
            }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              저장
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Featured Topics */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Featured Topics ({featuredTopics.length}/8)
          </h3>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={featuredTopics.map(t => t.topic_name)}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-h-[300px] p-3 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                {featuredTopics.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Plus className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">오른쪽에서 토픽을 선택하세요</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {featuredTopics.map((topic, index) => (
                      <SortableTopicItem
                        key={topic.topic_name}
                        topic={topic}
                        index={index}
                        onRemove={() => removeTopic(topic.topic_name)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: All Topics */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            모든 Topics ({allTopics.length})
          </h3>

          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="토픽 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 p-3 border rounded-lg bg-white">
            {filteredAllTopics.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredAllTopics.map(topic => {
                const isFeatured = featuredTopics.some(f => f.topic_name === topic.topic_name);
                return (
                  <div
                    key={topic.topic_name}
                    className={`flex items-center justify-between p-2 border rounded-lg text-sm transition-colors ${isFeatured ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex-1">
                      <span className={`font-medium ${isFeatured ? 'text-green-800' : 'text-gray-900'}`}>
                        {topic.topic_name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({topic.post_count}개)
                      </span>
                    </div>
                    {!isFeatured ? (
                      <button
                        onClick={() => addTopic(topic.topic_name)}
                        disabled={featuredTopics.length >= 8}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-green-primary text-white rounded hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                        추가
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">✓</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sortable Topic Item Component
function SortableTopicItem({
  topic,
  index,
  onRemove
}: {
  topic: FeaturedTopic;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: topic.topic_name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          type="button"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-xs font-medium text-gray-600 min-w-[20px]">
          {index + 1}.
        </span>
        <span className="text-sm text-gray-900">{topic.topic_name}</span>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Founder Picks Manager Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SortablePickItem({
  pick,
  post,
  index,
  onRemove
}: {
  pick: FeaturedPick;
  post: FounderPickPost;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: pick.post_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          type="button"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-xs font-medium text-gray-600 min-w-[20px]">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{post.title}</p>
          {post.category && (
            <p className="text-xs text-gray-500">{post.category}</p>
          )}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function FounderPicksManager() {
  const [allPosts, setAllPosts] = useState<FounderPickPost[]>([]);
  const [featuredPicks, setFeaturedPicks] = useState<FeaturedPick[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPicks();
  }, []);

  const fetchPicks = async () => {
    try {
      const response = await fetch('/api/admin/featured-founder-picks');
      if (response.ok) {
        const data = await response.json();
        setAllPosts(data.all_posts || []);

        // Map featured picks with post data
        const picksWithPosts = (data.featured_picks || []).map((f: any) => {
          const post = (data.all_posts || []).find((p: FounderPickPost) => p.id === f.post_id);
          return {
            post_id: f.post_id,
            display_order: f.display_order,
            post: post
          };
        });
        setFeaturedPicks(picksWithPosts);
      } else if (response.status === 403) {
        setMessage({ type: 'error', text: 'Admin 권한이 필요합니다.' });
      }
    } catch (error) {
      console.error('Failed to fetch founder picks:', error);
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = featuredPicks.findIndex(p => p.post_id === active.id);
      const newIndex = featuredPicks.findIndex(p => p.post_id === over.id);

      const reordered = arrayMove(featuredPicks, oldIndex, newIndex);
      const updated = reordered.map((pick, index) => ({
        ...pick,
        display_order: index + 1
      }));

      setFeaturedPicks(updated);
    }
  };

  const addPick = (postId: string) => {
    if (featuredPicks.length >= 3) {
      setMessage({ type: 'error', text: '최대 3개까지만 선택할 수 있습니다.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (featuredPicks.some(p => p.post_id === postId)) {
      setMessage({ type: 'error', text: '이미 추가된 포스트입니다.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    setFeaturedPicks([
      ...featuredPicks,
      { post_id: postId, display_order: featuredPicks.length + 1, post: post }
    ]);
    setMessage(null);
  };

  const removePick = (postId: string) => {
    const updated = featuredPicks
      .filter(p => p.post_id !== postId)
      .map((pick, index) => ({
        ...pick,
        display_order: index + 1
      }));
    setFeaturedPicks(updated);
  };

  const saveFeaturedPicks = async () => {
    if (featuredPicks.length === 0) {
      setMessage({ type: 'error', text: '최소 1개 이상의 포스트를 선택해주세요.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const picks = featuredPicks.map(pick => ({
        post_id: pick.post_id,
        order: pick.display_order
      }));

      const response = await fetch('/api/admin/featured-founder-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ picks }),
        credentials: 'include'
      });

      if (response.ok) {
        setMessage({ type: 'success', text: '✅ Founder Picks가 저장되었습니다!' });
        await fetchPicks();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: `❌ 저장 실패: ${data.error}` });
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: '❌ 저장 중 오류가 발생했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredAllPosts = searchQuery
    ? allPosts.filter(post =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : allPosts

  // 표시 개수 제한: 검색 중이면 전체, 아니면 최근 10개만
  const displayPosts = searchQuery ? filteredAllPosts : filteredAllPosts.slice(0, 10);

  if (loading) {
    return (
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-green-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Founder Picks</h2>
          <p className="text-sm text-gray-500 mt-1">
            오른쪽 사이드바의 'Founder Picks' 섹션 (최대 3개)
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {featuredPicks.length}/3 선택됨
          </p>
        </div>
        <button
          onClick={saveFeaturedPicks}
          disabled={saving || featuredPicks.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${saving || featuredPicks.length === 0
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-green-primary text-white hover:bg-green-hover'
            }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              저장
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Featured Picks */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Featured Picks ({featuredPicks.length}/3)
          </h3>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={featuredPicks.map(p => p.post_id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-h-[300px] p-3 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                {featuredPicks.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Plus className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">오른쪽에서 포스트를 선택하세요</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {featuredPicks.map((pick, index) => (
                      pick.post && (
                        <SortablePickItem
                          key={pick.post_id}
                          pick={pick}
                          post={pick.post}
                          index={index}
                          onRemove={() => removePick(pick.post_id)}
                        />
                      )
                    ))}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: All Posts */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            모든 Posts ({allPosts.length})
          </h3>

          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="포스트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary"
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 p-3 border rounded-lg bg-white">
            {displayPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {searchQuery ? '검색 결과가 없습니다' : '포스트가 없습니다'}
              </div>
            ) : (
              <>
                {displayPosts.map(post => {
                  const isFeatured = featuredPicks.some(f => f.post_id === post.id);
                  return (
                    <div
                      key={post.id}
                      className={`flex items-center justify-between p-2 border rounded-lg transition-colors ${isFeatured ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isFeatured ? 'text-green-800' : 'text-gray-900'}`}>
                          {post.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          {post.category && <span className="px-1.5 py-0.5 bg-gray-100 rounded">{post.category}</span>}
                          {post.reading_time && <span>{post.reading_time}분</span>}
                        </div>
                      </div>
                      {!isFeatured ? (
                        <button
                          onClick={() => addPick(post.id)}
                          disabled={featuredPicks.length >= 3}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-primary text-white rounded hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                        >
                          <Plus className="w-3 h-3" />
                          추가
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-medium ml-2">✓</span>
                      )}
                    </div>
                  );
                })}

                {/* 더보기 안내 */}
                {!searchQuery && filteredAllPosts.length > 10 && (
                  <div className="text-center py-3 border-t">
                    <p className="text-xs text-gray-500">
                      + {filteredAllPosts.length - 10}개 더 있습니다
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      검색을 사용하여 찾아보세요
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function HomepageManagement() {
  const [configs, setConfigs] = useState<Record<string, Post[]>>({
    featured: [],
    founder_picks: [],
    topics: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/homepage/config');
      const result = await response.json();

      if (result.success) {
        const configMap: Record<string, Post[]> = {
          featured: [],
          founder_picks: [],
          topics: []
        };
        result.data.forEach((config: HomepageConfig) => {
          configMap[config.config_type] = config.selected_posts || [];
        });
        setConfigs(configMap);
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
      alert('설정을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save each config type
      const savePromises = Object.entries(configs).map(([configType, posts]) =>
        fetch('/api/admin/homepage/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config_type: configType,
            selected_posts: posts,
            display_order: posts.map((_, idx) => idx)
          })
        })
      );

      const results = await Promise.all(savePromises);
      const allSucceeded = results.every(r => r.ok);

      if (allSucceeded) {
        alert('✅ 저장되었습니다!');
      } else {
        throw new Error('Some configs failed to save');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('❌ 저장 실패. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-primary" />
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">메인 페이지 관리</h1>
            <p className="text-gray-600">
              메인 페이지에 표시될 포스트를 선택하고 순서를 관리하세요
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              미리보기
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-primary text-white hover:bg-green-hover'
                }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  저장
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* Founder Picks 섹션 - Founder Picks 관리 UI */}
          <FounderPicksManager />

          {/* Topics 섹션 - 토픽 관리 UI */}
          <TopicsManager />

          {/* Help Text */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">💡 사용 방법</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 드래그 앤 드롭으로 순서를 변경할 수 있습니다</li>
              <li>• 변경 후 저장 버튼을 클릭하여 적용하세요</li>
              <li>• 미리보기로 실제 표시를 확인할 수 있습니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
