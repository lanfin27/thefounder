// api/baseline/route.ts
// API endpoints for baseline database operations

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const DB_PATH = path.join(process.cwd(), 'data', 'flippa_baseline.db');

async function getDb() {
    return open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });
}

// GET /api/baseline - Search and retrieve listings
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const db = await getDb();

        // Get operation type
        const operation = searchParams.get('op') || 'search';

        switch (operation) {
            case 'stats':
                // Get database statistics
                const totalResult = await db.get('SELECT COUNT(*) as count FROM baseline_listings WHERE is_active = 1');
                
                const byCategory = await db.all(`
                    SELECT category, COUNT(*) as count 
                    FROM baseline_listings 
                    WHERE is_active = 1 
                    GROUP BY category 
                    ORDER BY count DESC
                `);

                const priceStats = await db.get(`
                    SELECT 
                        MIN(price) as min,
                        MAX(price) as max,
                        AVG(price) as avg
                    FROM baseline_listings 
                    WHERE is_active = 1 AND price > 0
                `);

                await db.close();

                return NextResponse.json({
                    success: true,
                    stats: {
                        totalListings: totalResult.count,
                        byCategory,
                        priceRange: {
                            min: priceStats.min,
                            max: priceStats.max,
                            average: priceStats.avg
                        }
                    }
                });

            case 'search':
                // Search listings
                let query = 'SELECT * FROM baseline_listings WHERE is_active = 1';
                const params: any[] = [];

                const category = searchParams.get('category');
                if (category) {
                    query += ' AND category = ?';
                    params.push(category);
                }

                const status = searchParams.get('status');
                if (status) {
                    query += ' AND status = ?';
                    params.push(status);
                }

                const minPrice = searchParams.get('minPrice');
                if (minPrice) {
                    query += ' AND price >= ?';
                    params.push(parseFloat(minPrice));
                }

                const maxPrice = searchParams.get('maxPrice');
                if (maxPrice) {
                    query += ' AND price <= ?';
                    params.push(parseFloat(maxPrice));
                }

                const searchText = searchParams.get('q');
                if (searchText) {
                    query += ' AND (title LIKE ? OR description LIKE ?)';
                    const searchPattern = `%${searchText}%`;
                    params.push(searchPattern, searchPattern);
                }

                const limit = searchParams.get('limit') || '50';
                query += ' ORDER BY created_at DESC LIMIT ?';
                params.push(parseInt(limit));

                const listings = await db.all(query, params);
                await db.close();

                return NextResponse.json({
                    success: true,
                    count: listings.length,
                    listings
                });

            case 'history':
                // Get change history for a listing
                const listingId = searchParams.get('id');
                if (!listingId) {
                    return NextResponse.json(
                        { error: 'Listing ID required' },
                        { status: 400 }
                    );
                }

                const history = await db.all(`
                    SELECT * FROM tracking_log 
                    WHERE listing_id = ? 
                    ORDER BY change_timestamp DESC
                `, listingId);

                await db.close();

                return NextResponse.json({
                    success: true,
                    listingId,
                    history
                });

            case 'compare':
                // Compare with current Supabase data
                const comparison = {
                    baselineOnly: 0,
                    supabaseOnly: 0,
                    inBoth: 0,
                    priceChanges: 0
                };

                // This would compare with your Supabase data
                // For now, just return the structure
                await db.close();

                return NextResponse.json({
                    success: true,
                    comparison,
                    message: 'Comparison endpoint ready for integration'
                });

            default:
                await db.close();
                return NextResponse.json(
                    { error: 'Invalid operation' },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error('Baseline API error:', error);
        return NextResponse.json(
            { error: 'Database operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

// POST /api/baseline - Track changes
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { listingId, action, changes, source = 'api' } = body;

        if (!listingId || !action) {
            return NextResponse.json(
                { error: 'listingId and action are required' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Track changes
        if (changes && typeof changes === 'object') {
            for (const [field, value] of Object.entries(changes)) {
                await db.run(`
                    INSERT INTO tracking_log (
                        listing_id, action, field_name, new_value, 
                        change_source, change_metadata
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    listingId,
                    action,
                    field,
                    String(value),
                    source,
                    JSON.stringify({ timestamp: new Date().toISOString() })
                ]);
            }
        } else {
            // Track action without field changes
            await db.run(`
                INSERT INTO tracking_log (
                    listing_id, action, change_source, change_metadata
                ) VALUES (?, ?, ?, ?)
            `, [
                listingId,
                action,
                source,
                JSON.stringify({ timestamp: new Date().toISOString() })
            ]);
        }

        await db.close();

        return NextResponse.json({
            success: true,
            message: 'Changes tracked successfully',
            listingId,
            action
        });

    } catch (error) {
        console.error('Baseline tracking error:', error);
        return NextResponse.json(
            { error: 'Failed to track changes', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}