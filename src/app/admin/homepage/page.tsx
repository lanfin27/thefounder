'use client';

import { useState, useEffect } from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Eye, Save, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface Post {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  readingTime: number;
  cover?: string;
}

interface HomepageConfig {
  featured_posts: Post[];
  founder_picks: Post[];
  topics: Array<{ id: string; label: string; count: number }>;
}

// Sortable Item Component
function SortableItem({
  post,
  onRemove
}: {
  post: Post;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-4 bg-white border border-ink-200 rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-ink-50 rounded"
      >
        <GripVertical className="h-5 w-5 text-ink-400" />
      </button>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-ink-900 truncate">
          {post.title}
        </h4>
        <div className="flex items-center gap-2 mt-1 text-xs text-ink-600">
          <span className="px-2 py-0.5 bg-ink-100 rounded">
            {post.category}
          </span>
          <span>{post.readingTime}분</span>
        </div>
      </div>

      <button
        onClick={onRemove}
        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// Post Selection Modal
function PostSelectionModal({
  isOpen,
  onClose,
  onSelect,
  maxSelection,
  currentSelection,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (posts: Post[]) => void;
  maxSelection: number;
  currentSelection: Post[];
}) {
  const [selectedPosts, setSelectedPosts] = useState<Post[]>(currentSelection);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock posts data - Replace with actual API call
  const allPosts: Post[] = [
    {
      id: '1',
      title: '위대한 창업가를 만드는 30가지 조언',
      category: '인사이트',
      excerpt: '실제로 성공한 창업가들의 공통점',
      readingTime: 8,
    },
    {
      id: '2',
      title: '코딩은 AI가 한다, 그럼 창업자는?',
      category: '트렌드',
      excerpt: 'Product의 시대에서 Distribution의 시대로',
      readingTime: 6,
    },
    {
      id: '3',
      title: 'SaaS로 월 $10K MRR 달성하기',
      category: '사례',
      excerpt: '0에서 시작한 SaaS 성장 스토리',
      readingTime: 10,
    },
    {
      id: '4',
      title: '낭만파트너스 김만반의 1인 창업 스토리',
      category: '사례',
      excerpt: '혼자서도 할 수 있다는 믿음',
      readingTime: 12,
    },
    {
      id: '5',
      title: 'Product-Market Fit을 찾는 방법',
      category: '인사이트',
      excerpt: '토스가 PMF를 찾은 과정',
      readingTime: 9,
    },
    {
      id: '6',
      title: '당근마켓의 커뮤니티 전략',
      category: '사례',
      excerpt: '하이퍼로컬의 성공 방정식',
      readingTime: 11,
    },
  ];

  const filteredPosts = allPosts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePost = (post: Post) => {
    const isSelected = selectedPosts.some(p => p.id === post.id);

    if (isSelected) {
      setSelectedPosts(selectedPosts.filter(p => p.id !== post.id));
    } else {
      if (selectedPosts.length < maxSelection) {
        setSelectedPosts([...selectedPosts, post]);
      }
    }
  };

  const handleConfirm = () => {
    onSelect(selectedPosts);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-6 border-b border-ink-200">
            <Dialog.Title className="text-xl font-bold text-ink-900">
              포스트 선택 (최대 {maxSelection}개)
            </Dialog.Title>
            <Dialog.Description className="text-sm text-ink-600 mt-1">
              {selectedPosts.length} / {maxSelection} 선택됨
            </Dialog.Description>

            <input
              type="text"
              placeholder="포스트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full mt-4 px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-primary"
            />
          </div>

          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <div className="space-y-2">
              {filteredPosts.map((post) => {
                const isSelected = selectedPosts.some(p => p.id === post.id);

                return (
                  <button
                    key={post.id}
                    onClick={() => togglePost(post)}
                    disabled={!isSelected && selectedPosts.length >= maxSelection}
                    className={`w-full text-left p-4 border rounded-lg transition-all ${
                      isSelected
                        ? 'border-green-primary bg-green-light'
                        : 'border-ink-200 hover:border-ink-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <h4 className="font-semibold text-ink-900 mb-1">
                      {post.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-ink-600">
                      <span className="px-2 py-0.5 bg-ink-100 rounded">
                        {post.category}
                      </span>
                      <span>{post.readingTime}분</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-ink-200 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button className="px-4 py-2 text-ink-700 hover:bg-ink-50 rounded-lg transition-colors">
                취소
              </button>
            </Dialog.Close>
            <button
              onClick={handleConfirm}
              disabled={selectedPosts.length === 0}
              className="px-4 py-2 bg-green-primary text-white rounded-lg hover:bg-green-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              확인
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Main Admin Homepage Component
export default function AdminHomepagePage() {
  const [config, setConfig] = useState<HomepageConfig>({
    featured_posts: [],
    founder_picks: [],
    topics: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [modalType, setModalType] = useState<'featured' | 'picks' | null>(null);

  // Load config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/homepage/config');
      // const data = await response.json();
      // setConfig(data);

      // Mock data for now
      setConfig({
        featured_posts: [],
        founder_picks: [],
        topics: [
          { id: 'startup', label: '스타트업', count: 24 },
          { id: 'ai', label: 'AI', count: 31 },
          { id: 'saas', label: 'SaaS', count: 42 },
          { id: 'marketing', label: '마케팅', count: 18 },
        ],
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      // TODO: Replace with actual API call
      // await fetch('/api/homepage/config', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config),
      // });
      alert('저장되었습니다!');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent, type: 'featured' | 'picks') => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setConfig((prev) => {
        const items = type === 'featured' ? prev.featured_posts : prev.founder_picks;
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        return {
          ...prev,
          [type === 'featured' ? 'featured_posts' : 'founder_picks']: newItems,
        };
      });
    }
  };

  const removePost = (id: string, type: 'featured' | 'picks') => {
    setConfig((prev) => ({
      ...prev,
      [type === 'featured' ? 'featured_posts' : 'founder_picks']:
        (type === 'featured' ? prev.featured_posts : prev.founder_picks)
          .filter((post) => post.id !== id),
    }));
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-ink-50 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-ink-900 mb-2">
                Homepage Management
              </h1>
              <p className="text-ink-600">
                메인 페이지 Featured 섹션과 사이드바를 관리합니다
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.open('/', '_blank')}
                className="flex items-center gap-2 px-4 py-2 border border-ink-300 text-ink-900 rounded-lg hover:bg-ink-50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                미리보기
              </button>
              <button
                onClick={saveConfig}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-green-primary text-white rounded-lg hover:bg-green-hover transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Featured Posts (6개) */}
            <div className="bg-white rounded-xl border border-ink-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-ink-900">
                    Featured Posts
                  </h2>
                  <p className="text-sm text-ink-600 mt-1">
                    메인 비주얼 섹션 (최대 6개)
                  </p>
                </div>
                <button
                  onClick={() => setModalType('featured')}
                  disabled={config.featured_posts.length >= 6}
                  className="flex items-center gap-2 px-4 py-2 bg-green-primary text-white rounded-lg hover:bg-green-hover transition-colors disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  추가
                </button>
              </div>

              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'featured')}
              >
                <SortableContext
                  items={config.featured_posts.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {config.featured_posts.map((post) => (
                      <SortableItem
                        key={post.id}
                        post={post}
                        onRemove={() => removePost(post.id, 'featured')}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {config.featured_posts.length === 0 && (
                <div className="text-center py-12 text-ink-500">
                  포스트를 추가해주세요
                </div>
              )}
            </div>

            {/* Founder Picks (3개) */}
            <div className="bg-white rounded-xl border border-ink-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-ink-900">
                    Founder Picks
                  </h2>
                  <p className="text-sm text-ink-600 mt-1">
                    오른쪽 사이드바 추천 (최대 3개)
                  </p>
                </div>
                <button
                  onClick={() => setModalType('picks')}
                  disabled={config.founder_picks.length >= 3}
                  className="flex items-center gap-2 px-4 py-2 bg-green-primary text-white rounded-lg hover:bg-green-hover transition-colors disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  추가
                </button>
              </div>

              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, 'picks')}
              >
                <SortableContext
                  items={config.founder_picks.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {config.founder_picks.map((post) => (
                      <SortableItem
                        key={post.id}
                        post={post}
                        onRemove={() => removePost(post.id, 'picks')}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {config.founder_picks.length === 0 && (
                <div className="text-center py-12 text-ink-500">
                  포스트를 추가해주세요
                </div>
              )}
            </div>
          </div>

          {/* Topics Section */}
          <div className="mt-8 bg-white rounded-xl border border-ink-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-ink-900">
                Topics (키워드)
              </h2>
              <p className="text-sm text-ink-600 mt-1">
                글에서 추출된 키워드들이 자동으로 표시됩니다
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {config.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="flex items-center gap-2 px-4 py-2 bg-ink-100 rounded-full"
                >
                  <span className="text-sm font-medium text-ink-900">
                    {topic.label}
                  </span>
                  <span className="text-xs text-ink-600">
                    {topic.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PostSelectionModal
        isOpen={modalType === 'featured'}
        onClose={() => setModalType(null)}
        onSelect={(posts) => setConfig(prev => ({ ...prev, featured_posts: posts }))}
        maxSelection={6}
        currentSelection={config.featured_posts}
      />

      <PostSelectionModal
        isOpen={modalType === 'picks'}
        onClose={() => setModalType(null)}
        onSelect={(posts) => setConfig(prev => ({ ...prev, founder_picks: posts }))}
        maxSelection={3}
        currentSelection={config.founder_picks}
      />
    </AdminGuard>
  );
}
