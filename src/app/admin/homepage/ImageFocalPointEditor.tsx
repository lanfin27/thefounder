import React, { useState, useRef, useEffect } from 'react';
import { X, Move } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

interface ImageFocalPointEditorProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    initialFocalPoint?: { x: number; y: number };
    onSave: (focalPoint: { x: number; y: number }) => void;
}

export default function ImageFocalPointEditor({
    isOpen,
    onClose,
    imageUrl,
    initialFocalPoint = { x: 50, y: 50 },
    onSave
}: ImageFocalPointEditorProps) {
    const [focalPoint, setFocalPoint] = useState(initialFocalPoint);
    const [isDragging, setIsDragging] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFocalPoint(initialFocalPoint);
        }
    }, [isOpen, initialFocalPoint]);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        updateFocalPoint(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            updateFocalPoint(e.clientX, e.clientY);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const updateFocalPoint = (clientX: number, clientY: number) => {
        if (!imageRef.current || !containerRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

        setFocalPoint({ x, y });
    };

    // Touch support
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        updateFocalPoint(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging) {
            e.preventDefault(); // Prevent scrolling while dragging
            updateFocalPoint(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col z-50">
                    <div className="flex items-center justify-between p-4 border-b">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                            이미지 포커스 설정
                        </Dialog.Title>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <p className="text-sm text-gray-600 mb-4">
                            이미지의 가장 중요한 부분을 클릭하거나 드래그하여 포커스를 맞춰주세요.
                            이 부분은 이미지가 잘릴 때 항상 중앙에 위치하게 됩니다.
                        </p>

                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Editor Area */}
                            <div className="flex-1">
                                <div
                                    ref={containerRef}
                                    className="relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 select-none cursor-crosshair"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onTouchStart={handleTouchStart}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <img
                                        ref={imageRef}
                                        src={imageUrl}
                                        alt="Focal point editor"
                                        className="w-full h-auto block pointer-events-none"
                                        draggable={false}
                                    />

                                    {/* Focal Point Marker */}
                                    <div
                                        className="absolute w-8 h-8 -ml-4 -mt-4 border-2 border-white rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none transition-transform duration-75"
                                        style={{
                                            left: `${focalPoint.x}%`,
                                            top: `${focalPoint.y}%`,
                                            transform: isDragging ? 'scale(1.2)' : 'scale(1)'
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-sm" />
                                    </div>

                                    {/* Grid Lines (Optional visual aid) */}
                                    <div className="absolute inset-0 pointer-events-none opacity-20">
                                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                                        <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white" />
                                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                                        <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white" />
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-between text-xs text-gray-500 font-mono">
                                    <span>X: {focalPoint.x.toFixed(1)}%</span>
                                    <span>Y: {focalPoint.y.toFixed(1)}%</span>
                                </div>
                            </div>

                            {/* Preview Area */}
                            <div className="w-full md:w-64 space-y-4">
                                <h3 className="text-sm font-medium text-gray-900">미리보기</h3>

                                {/* Square Preview */}
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">1:1 비율 (모바일/썸네일)</p>
                                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 relative border border-gray-200">
                                        <img
                                            src={imageUrl}
                                            alt="Preview square"
                                            className="absolute w-full h-full object-cover transition-all duration-100"
                                            style={{
                                                objectPosition: `${focalPoint.x}% ${focalPoint.y}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Landscape Preview */}
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">16:9 비율 (데스크톱 메인)</p>
                                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-gray-100 relative border border-gray-200">
                                        <img
                                            src={imageUrl}
                                            alt="Preview landscape"
                                            className="absolute w-full h-full object-cover transition-all duration-100"
                                            style={{
                                                objectPosition: `${focalPoint.x}% ${focalPoint.y}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => onSave(focalPoint)}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm"
                        >
                            저장하기
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
