'use client';

import { useEffect, useRef } from 'react';

interface PriceTrendChartProps {
  data: Array<{
    timestamp: string;
    price: number;
    label: string;
  }>;
  height?: number;
}

export default function PriceTrendChart({ data, height = 200 }: PriceTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = height + 'px';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate dimensions
    const padding = 40;
    const graphWidth = rect.width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // Find min and max prices
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(rect.width - padding, height - padding);
    ctx.stroke();

    // Draw grid lines and price labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
      const y = padding + (graphHeight * i / 4);
      const price = maxPrice - (priceRange * i / 4);
      
      // Grid line
      ctx.strokeStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
      
      // Price label
      ctx.fillText(`$${Math.round(price).toLocaleString()}`, padding - 5, y + 4);
    }

    // Draw line chart
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (graphWidth * index / (data.length - 1));
      const y = padding + (graphHeight * (maxPrice - point.price) / priceRange);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    data.forEach((point, index) => {
      const x = padding + (graphWidth * index / (data.length - 1));
      const y = padding + (graphHeight * (maxPrice - point.price) / priceRange);

      // Point
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Hover area (invisible, just for tooltip positioning)
      if (index === data.length - 1) {
        // Show last price
        ctx.fillStyle = '#1f2937';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`$${point.price.toLocaleString()}`, x, y - 10);
      }
    });

    // Draw time labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    
    if (data.length > 0) {
      // First timestamp
      const firstDate = new Date(data[0].timestamp);
      ctx.fillText(
        firstDate.toLocaleDateString(), 
        padding, 
        height - padding + 20
      );
      
      // Last timestamp
      const lastDate = new Date(data[data.length - 1].timestamp);
      ctx.fillText(
        lastDate.toLocaleDateString(), 
        rect.width - padding, 
        height - padding + 20
      );
    }

  }, [data, height]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No price data available
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        className="w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}