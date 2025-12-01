import React, { useState, useEffect } from 'react';
import { Plus, X, Image as ImageIcon, Loader2, Save, Search, GripVertical } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import ImageFocalPointEditor from './ImageFocalPointEditor';

interface Post {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    image_url?: string;
}

interface FeaturedPostConfig {
    id?: string;
    post_id: string;
    position: number;
    focal_point_x: number;
    focal_point_y: number;
    post?: Post;
}

interface FeaturedPostsManagerProps {
    initialConfigs?: FeaturedPostConfig[];
}

export default function FeaturedPostsManager() {
    const [configs, setConfigs] = useState<FeaturedPostConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Modal states
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [isFocalPointModalOpen, setIsFocalPointModalOpen] = useState(false);
    const [activePosition, setActivePosition] = useState<number | null>(null);
    const [activeConfigForFocalPoint, setActiveConfigForFocalPoint] = useState<FeaturedPostConfig | null>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const response = await fetch('/api/admin/featured-posts');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setConfigs(result.data);
                }
            } else {
                console.error('Failed to fetch featured posts');
            }
        } catch (error) {
            console.error('Error fetching featured posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/featured-posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configs }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: '✅ Featured posts가 저장되었습니다!' });
                fetchConfigs(); // Refresh data
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

    const handleSelectPost = (post: Post) => {
        if (activePosition === null) return;

        // Remove any existing config for this position
        const otherConfigs = configs.filter(c => c.position !== activePosition);

        // Create new config
        const newConfig: FeaturedPostConfig = {
            post_id: post.id,
            position: activePosition,
            focal_point_x: 50,
            focal_point_y: 50,
            post: post
        };

        setConfigs([...otherConfigs, newConfig]);
        setIsSelectionModalOpen(false);
        setActivePosition(null);
    };

    const handleRemovePost = (position: number) => {
        setConfigs(configs.filter(c => c.position !== position));
    };

    const openFocalPointEditor = (config: FeaturedPostConfig) => {
        setActiveConfigForFocalPoint(config);
        setIsFocalPointModalOpen(true);
    };

    const handleSaveFocalPoint = (focalPoint: { x: number; y: number }) => {
        if (!activeConfigForFocalPoint) return;

        setConfigs(configs.map(c =>
            c.position === activeConfigForFocalPoint.position
                ? { ...c, focal_point_x: focalPoint.x, focal_point_y: focalPoint.y }
                : c
        ));

        setIsFocalPointModalOpen(false);
        setActiveConfigForFocalPoint(null);
    };

    const getConfigForPosition = (position: number) => {
        return configs.find(c => c.position === position);
    };

    if (loading) {
        return (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Featured Posts</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        메인 페이지 상단의 '주목할 만한 이야기' 섹션 (총 4개)
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${saving
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
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
                    className={`mb-6 p-3 rounded-lg text-sm ${message.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                >
                    {message.text}
                </div>
            )}

            {/* Grid Layout Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
                {/* Main Featured Post (Position 1) */}
                <FeaturedPostSlot
                    position={1}
                    label="메인 (큰 이미지)"
                    config={getConfigForPosition(1)}
                    onSelect={() => {
                        setActivePosition(1);
                        setIsSelectionModalOpen(true);
                    }}
                    onRemove={() => handleRemovePost(1)}
                    onEditFocalPoint={openFocalPointEditor}
                    className="h-full"
                />

                {/* Sub Featured Posts (Positions 2-4) */}
                <div className="flex flex-col gap-4 h-full">
                    {[2, 3, 4].map(pos => (
                        <FeaturedPostSlot
                            key={pos}
                            position={pos}
                            label={`서브 ${pos - 1} (작은 이미지)`}
                            config={getConfigForPosition(pos)}
                            onSelect={() => {
                                setActivePosition(pos);
                                setIsSelectionModalOpen(true);
                            }}
                            onRemove={() => handleRemovePost(pos)}
                            onEditFocalPoint={openFocalPointEditor}
                            className="flex-1"
                        />
                    ))}
                </div>
            </div>

            {/* Post Selection Modal */}
            <PostSelectionModal
                isOpen={isSelectionModalOpen}
                onClose={() => setIsSelectionModalOpen(false)}
                onSelect={handleSelectPost}
                excludeIds={configs.map(c => c.post_id)}
            />

            {/* Focal Point Editor Modal */}
            {activeConfigForFocalPoint && activeConfigForFocalPoint.post?.image_url && (
                <ImageFocalPointEditor
                    isOpen={isFocalPointModalOpen}
                    onClose={() => setIsFocalPointModalOpen(false)}
                    imageUrl={activeConfigForFocalPoint.post.image_url}
                    initialFocalPoint={{
                        x: activeConfigForFocalPoint.focal_point_x,
                        y: activeConfigForFocalPoint.focal_point_y
                    }}
                    onSave={handleSaveFocalPoint}
                />
            )}
        </div>
    );
}

function FeaturedPostSlot({
    position,
    label,
    config,
    onSelect,
    onRemove,
    onEditFocalPoint,
    className = ''
}: {
    position: number;
    label: string;
    config?: FeaturedPostConfig;
    onSelect: () => void;
    onRemove: () => void;
    onEditFocalPoint: (config: FeaturedPostConfig) => void;
    className?: string;
}) {
    return (
        <div className={`relative border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white transition-all ${className} ${!config ? 'hover:border-green-400 hover:bg-green-50' : 'border-solid border-gray-200'}`}>
            {config && config.post ? (
                <div className="absolute inset-0 flex flex-col">
                    {/* Image Area */}
                    <div className="relative flex-1 overflow-hidden bg-gray-100 group">
                        {config.post.image_url ? (
                            <img
                                src={config.post.image_url}
                                alt={config.post.title}
                                className="w-full h-full object-cover transition-transform duration-500"
                                style={{
                                    objectPosition: `${config.focal_point_x}% ${config.focal_point_y}%`
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        )}

                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            {config.post.image_url && (
                                <button
                                    onClick={() => onEditFocalPoint(config)}
                                    className="px-4 py-2 bg-white text-gray-900 rounded-lg shadow-lg font-medium hover:bg-gray-50 transition-transform transform scale-95 group-hover:scale-100"
                                >
                                    이미지 포커스 설정
                                </button>
                            )}
                        </div>

                        {/* Position Label Badge */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 text-white text-xs rounded backdrop-blur-sm">
                            {label}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="font-medium text-gray-900 truncate">{config.post.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{config.post.category}</p>
                            </div>
                            <button
                                onClick={onRemove}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={onSelect}
                    className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2"
                >
                    <Plus className="w-8 h-8" />
                    <span className="text-sm font-medium">{label} 선택</span>
                </button>
            )}
        </div>
    );
}

// Reuse the existing PostSelectionModal but adapted for this context
function PostSelectionModal({
    isOpen,
    onClose,
    onSelect,
    excludeIds = []
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (post: Post) => void;
    excludeIds?: string[];
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
                `/api/admin/homepage/posts/search?q=${encodeURIComponent(searchQuery)}&limit=20`
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

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col z-50">
                    <div className="flex items-center justify-between p-6 border-b">
                        <Dialog.Title className="text-lg font-semibold">
                            포스트 선택
                        </Dialog.Title>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="제목으로 검색..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
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
                            posts.map(post => {
                                const isExcluded = excludeIds.includes(post.id);
                                return (
                                    <button
                                        key={post.id}
                                        onClick={() => {
                                            if (!isExcluded) {
                                                onSelect(post);
                                            }
                                        }}
                                        disabled={isExcluded}
                                        className={`w-full text-left p-4 rounded-lg border transition-colors ${isExcluded
                                                ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                                                : 'hover:bg-gray-50 border-gray-200'
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
                                            </div>
                                            {isExcluded && (
                                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    이미 선택됨
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
