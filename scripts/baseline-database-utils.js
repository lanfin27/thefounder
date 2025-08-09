// baseline-database-utils.js
// Utility functions for working with the baseline database

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'flippa_baseline.db');

class BaselineDatabase {
    constructor() {
        this.db = null;
    }

    async connect() {
        if (!this.db) {
            this.db = await open({
                filename: DB_PATH,
                driver: sqlite3.Database
            });
        }
        return this.db;
    }

    async close() {
        if (this.db) {
            await this.db.close();
            this.db = null;
        }
    }

    // Track changes to listings
    async trackChange(listingId, action, fieldName = null, oldValue = null, newValue = null, source = 'manual') {
        const db = await this.connect();
        
        await db.run(`
            INSERT INTO tracking_log (
                listing_id, action, field_name, old_value, new_value, 
                change_source, change_metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            listingId,
            action,
            fieldName,
            oldValue ? String(oldValue) : null,
            newValue ? String(newValue) : null,
            source,
            JSON.stringify({ timestamp: new Date().toISOString() })
        ]);
    }

    // Get listing by ID
    async getListing(listingId) {
        const db = await this.connect();
        return await db.get('SELECT * FROM baseline_listings WHERE id = ?', listingId);
    }

    // Search listings
    async searchListings(criteria = {}) {
        const db = await this.connect();
        
        let query = 'SELECT * FROM baseline_listings WHERE 1=1';
        const params = [];

        if (criteria.category) {
            query += ' AND category = ?';
            params.push(criteria.category);
        }

        if (criteria.status) {
            query += ' AND status = ?';
            params.push(criteria.status);
        }

        if (criteria.minPrice !== undefined) {
            query += ' AND price >= ?';
            params.push(criteria.minPrice);
        }

        if (criteria.maxPrice !== undefined) {
            query += ' AND price <= ?';
            params.push(criteria.maxPrice);
        }

        if (criteria.searchText) {
            query += ' AND (title LIKE ? OR description LIKE ?)';
            const searchPattern = `%${criteria.searchText}%`;
            params.push(searchPattern, searchPattern);
        }

        if (criteria.limit) {
            query += ' LIMIT ?';
            params.push(criteria.limit);
        }

        return await db.all(query, params);
    }

    // Get change history for a listing
    async getListingHistory(listingId) {
        const db = await this.connect();
        
        return await db.all(`
            SELECT * FROM tracking_log 
            WHERE listing_id = ? 
            ORDER BY change_timestamp DESC
        `, listingId);
    }

    // Check for duplicates
    async checkDuplicate(title, url) {
        const db = await this.connect();
        const crypto = require('crypto');
        
        const titleHash = crypto.createHash('md5').update(title.toLowerCase()).digest('hex');
        const urlHash = crypto.createHash('md5').update(url).digest('hex');
        
        return await db.get(`
            SELECT dp.*, bl.title, bl.listing_url 
            FROM duplicate_prevention dp
            JOIN baseline_listings bl ON dp.listing_id = bl.id
            WHERE dp.title_hash = ? OR dp.url_hash = ?
        `, [titleHash, urlHash]);
    }

    // Update listing
    async updateListing(listingId, updates) {
        const db = await this.connect();
        
        // Get current values
        const current = await this.getListing(listingId);
        if (!current) {
            throw new Error(`Listing ${listingId} not found`);
        }

        // Track changes
        for (const [field, newValue] of Object.entries(updates)) {
            if (current[field] !== newValue) {
                await this.trackChange(
                    listingId, 
                    'UPDATE', 
                    field, 
                    current[field], 
                    newValue,
                    'api_update'
                );
            }
        }

        // Build update query
        const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(listingId);

        await db.run(
            `UPDATE baseline_listings SET ${fields}, last_updated = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        return await this.getListing(listingId);
    }

    // Mark listing as deleted (soft delete)
    async deleteListing(listingId, reason = 'unknown') {
        const listing = await this.getListing(listingId);
        if (!listing) {
            throw new Error(`Listing ${listingId} not found`);
        }

        await this.updateListing(listingId, { is_active: false });
        await this.trackChange(listingId, 'DELETE', null, null, null, reason);
    }

    // Get statistics
    async getStatistics() {
        const db = await this.connect();
        
        const stats = {};

        // Total listings
        const totalResult = await db.get('SELECT COUNT(*) as count FROM baseline_listings WHERE is_active = 1');
        stats.totalListings = totalResult.count;

        // By category
        stats.byCategory = await db.all(`
            SELECT category, COUNT(*) as count 
            FROM baseline_listings 
            WHERE is_active = 1 
            GROUP BY category 
            ORDER BY count DESC
        `);

        // By status
        stats.byStatus = await db.all(`
            SELECT status, COUNT(*) as count 
            FROM baseline_listings 
            WHERE is_active = 1 
            GROUP BY status 
            ORDER BY count DESC
        `);

        // Price statistics
        stats.priceStats = await db.get(`
            SELECT 
                MIN(price) as min,
                MAX(price) as max,
                AVG(price) as avg,
                COUNT(*) as count
            FROM baseline_listings 
            WHERE is_active = 1 AND price > 0
        `);

        // Recent changes
        stats.recentChanges = await db.all(`
            SELECT action, COUNT(*) as count 
            FROM tracking_log 
            WHERE change_timestamp > datetime('now', '-7 days')
            GROUP BY action
        `);

        // Duplicate statistics
        const dupStats = await db.get(`
            SELECT 
                COUNT(*) as total_duplicates,
                SUM(occurrence_count - 1) as duplicate_attempts
            FROM duplicate_prevention
        `);
        stats.duplicates = dupStats;

        return stats;
    }

    // Export data
    async exportToJSON(outputPath) {
        const db = await this.connect();
        
        const listings = await db.all('SELECT * FROM baseline_listings WHERE is_active = 1');
        
        const exportData = {
            exportDate: new Date().toISOString(),
            totalListings: listings.length,
            listings: listings
        };

        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
        console.log(`✅ Exported ${listings.length} listings to ${outputPath}`);
    }

    // Compare with new data
    async compareWithNewData(newListings) {
        const db = await this.connect();
        
        const comparison = {
            new: [],
            updated: [],
            deleted: [],
            unchanged: []
        };

        // Get all current listings
        const currentListings = await db.all('SELECT id, data_hash FROM baseline_listings WHERE is_active = 1');
        const currentMap = new Map(currentListings.map(l => [l.id, l.data_hash]));

        // Check new listings
        for (const newListing of newListings) {
            const currentHash = currentMap.get(newListing.id);
            
            if (!currentHash) {
                comparison.new.push(newListing);
            } else {
                const crypto = require('crypto');
                const newHash = crypto.createHash('sha256')
                    .update(JSON.stringify({
                        title: newListing.title,
                        price: newListing.price,
                        category: newListing.category,
                        status: newListing.status,
                        monthly_revenue: newListing.monthly_revenue,
                        monthly_profit: newListing.monthly_profit
                    }))
                    .digest('hex');

                if (currentHash !== newHash) {
                    comparison.updated.push(newListing);
                } else {
                    comparison.unchanged.push(newListing.id);
                }
                
                currentMap.delete(newListing.id);
            }
        }

        // Remaining items in currentMap are deleted
        comparison.deleted = Array.from(currentMap.keys());

        return comparison;
    }
}

// CLI interface
async function main() {
    const baseline = new BaselineDatabase();
    const command = process.argv[2];

    try {
        switch (command) {
            case 'stats':
                const stats = await baseline.getStatistics();
                console.log('\n📊 Database Statistics:');
                console.log(`Total Active Listings: ${stats.totalListings}`);
                console.log('\nBy Category:');
                stats.byCategory.forEach(cat => {
                    console.log(`  ${cat.category || 'Unknown'}: ${cat.count}`);
                });
                console.log('\nBy Status:');
                stats.byStatus.forEach(status => {
                    console.log(`  ${status.status}: ${status.count}`);
                });
                console.log('\nPrice Range:');
                console.log(`  Min: $${Math.floor(stats.priceStats.min)}`);
                console.log(`  Max: $${Math.floor(stats.priceStats.max)}`);
                console.log(`  Avg: $${Math.floor(stats.priceStats.avg)}`);
                break;

            case 'search':
                const searchTerm = process.argv[3];
                if (!searchTerm) {
                    console.log('Usage: node baseline-database-utils.js search <term>');
                    break;
                }
                const results = await baseline.searchListings({ searchText: searchTerm, limit: 10 });
                console.log(`\n🔍 Search Results for "${searchTerm}":`);
                results.forEach(listing => {
                    console.log(`\n${listing.id}: ${listing.title}`);
                    console.log(`  Price: $${listing.price}`);
                    console.log(`  Category: ${listing.category}`);
                    console.log(`  URL: ${listing.listing_url}`);
                });
                break;

            case 'history':
                const listingId = process.argv[3];
                if (!listingId) {
                    console.log('Usage: node baseline-database-utils.js history <listing_id>');
                    break;
                }
                const history = await baseline.getListingHistory(listingId);
                console.log(`\n📜 Change History for ${listingId}:`);
                history.forEach(change => {
                    console.log(`\n${change.change_timestamp} - ${change.action}`);
                    if (change.field_name) {
                        console.log(`  Field: ${change.field_name}`);
                        console.log(`  Old: ${change.old_value}`);
                        console.log(`  New: ${change.new_value}`);
                    }
                });
                break;

            case 'export':
                const outputPath = process.argv[3] || 'baseline_export.json';
                await baseline.exportToJSON(outputPath);
                break;

            default:
                console.log(`
Baseline Database Utilities
==========================

Commands:
  stats              Show database statistics
  search <term>      Search listings by text
  history <id>       Show change history for a listing
  export [file]      Export database to JSON

Examples:
  node baseline-database-utils.js stats
  node baseline-database-utils.js search "website"
  node baseline-database-utils.js history listing_123
  node baseline-database-utils.js export data.json
                `);
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await baseline.close();
    }
}

// Export class and run CLI if called directly
module.exports = BaselineDatabase;

if (require.main === module) {
    main().catch(console.error);
}