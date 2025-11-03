'use client';

import { AdminGuard } from '@/components/admin/AdminGuard';
import Link from 'next/link';
import {
  FileText,
  Database,
  Users,
  BarChart3,
  ArrowRight
} from 'lucide-react';

export default function AdminDashboard() {
  const sections = [
    {
      title: 'Posts Management',
      description: 'Create, edit, and manage all articles and blog posts on The Founder platform.',
      href: '/admin/posts',
      icon: FileText,
      stats: 'Content management',
      color: 'bg-green-primary'
    },
    {
      title: 'Notion Sync',
      description: 'Synchronize blog posts from Notion database to the website with automatic updates.',
      href: '/admin/sync',
      icon: Database,
      stats: 'Content sync',
      color: 'bg-ink-700'
    },
    {
      title: 'Users Management',
      description: 'Manage user accounts, permissions, and access control for the platform.',
      href: '/admin/users',
      icon: Users,
      stats: 'User control',
      color: 'bg-ink-600'
    },
    {
      title: 'Analytics Dashboard',
      description: 'View detailed analytics, performance metrics, and content statistics.',
      href: '/admin/analytics',
      icon: BarChart3,
      stats: 'Insights & metrics',
      color: 'bg-ink-500'
    }
  ];

  return (
    <AdminGuard>
      <div className="max-w-4xl mx-auto py-12">
        <div className="mb-10">
          <h1 className="text-h1 font-serif font-bold text-ink-900 mb-2">Admin Dashboard</h1>
          <p className="text-body text-ink-700">
            Manage content, users, and analytics for The Founder platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative bg-white border-2 border-ink-200 rounded-xl hover:border-green-primary hover:bg-green-light transition-all p-8"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className={`${section.color} rounded-lg p-3 text-white inline-flex mb-4`}>
                    <section.icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-h3 font-serif font-bold text-ink-900 mb-2 group-hover:text-green-primary transition-colors">
                    {section.title}
                  </h2>
                  <p className="text-caption text-ink-700 mb-3">
                    {section.description}
                  </p>
                  <div className="flex items-center text-tiny text-ink-600">
                    <span className="font-medium">{section.stats}</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-ink-400 group-hover:text-green-primary transition-colors flex-shrink-0 ml-4 mt-3" />
              </div>
            </Link>
          ))}
        </div>

        {/* Legacy dashboards - keeping for backward compatibility */}
        <div className="mt-12 pt-8 border-t border-divider">
          <h2 className="text-h3 font-serif font-bold text-ink-900 mb-6">Legacy Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/flippa-listings"
              className="p-6 border border-ink-200 rounded-lg hover:border-ink-300 hover:bg-ink-50 transition-colors"
            >
              <h3 className="text-body font-medium text-ink-900 mb-1">Flippa Listings</h3>
              <p className="text-caption text-ink-600">5,645+ business listings</p>
            </Link>
            <Link
              href="/admin/scraping-status"
              className="p-6 border border-ink-200 rounded-lg hover:border-ink-300 hover:bg-ink-50 transition-colors"
            >
              <h3 className="text-body font-medium text-ink-900 mb-1">Scraping Status</h3>
              <p className="text-caption text-ink-600">Monitor scraping jobs</p>
            </Link>
            <Link
              href="/admin/youtube-channels"
              className="p-6 border border-ink-200 rounded-lg hover:border-ink-300 hover:bg-ink-50 transition-colors"
            >
              <h3 className="text-body font-medium text-ink-900 mb-1">YouTube Channels</h3>
              <p className="text-caption text-ink-600">Manage channel data</p>
            </Link>
            <Link
              href="/admin/youtube-industry"
              className="p-6 border border-ink-200 rounded-lg hover:border-ink-300 hover:bg-ink-50 transition-colors"
            >
              <h3 className="text-body font-medium text-ink-900 mb-1">YouTube Industry</h3>
              <p className="text-caption text-ink-600">Industry analytics</p>
            </Link>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
