-- database-schema.sql
-- Comprehensive database schema for stealth collection system

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- Create schema
CREATE SCHEMA IF NOT EXISTS stealth_collection;
SET search_path TO stealth_collection, public;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Sessions table - tracks all collection sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_key VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Configuration
    strategy_name VARCHAR(100),
    proxy_type VARCHAR(50),
    proxy_country CHAR(2),
    browser_fingerprint JSONB,
    behavior_profile VARCHAR(50),
    
    -- Metrics
    pages_visited INTEGER DEFAULT 0,
    data_extracted INTEGER DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    detections_triggered INTEGER DEFAULT 0,
    success_rate DECIMAL(5,4),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_strategy ON sessions(strategy_name);

-- Collected data table - stores extracted information
CREATE TABLE collected_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Source information
    source_url TEXT NOT NULL,
    page_type VARCHAR(50),
    extraction_pattern VARCHAR(50),
    
    -- Extracted data (flexible JSON storage)
    data JSONB NOT NULL,
    
    -- Data quality metrics
    confidence_score DECIMAL(3,2),
    completeness_score DECIMAL(3,2),
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_errors JSONB,
    
    -- Temporal data
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexing for search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(data->>'title', '') || ' ' ||
            COALESCE(data->>'description', '') || ' ' ||
            COALESCE(data->>'category', '')
        )
    ) STORED
);

CREATE INDEX idx_collected_data_session ON collected_data(session_id);
CREATE INDEX idx_collected_data_url ON collected_data(source_url);
CREATE INDEX idx_collected_data_extracted ON collected_data(extracted_at);
CREATE INDEX idx_collected_data_search ON collected_data USING GIN(search_vector);
CREATE INDEX idx_collected_data_json ON collected_data USING GIN(data);

-- Listings table - normalized storage for business listings
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(255) UNIQUE,
    
    -- Basic information
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    url TEXT,
    
    -- Financial metrics
    price DECIMAL(12,2),
    revenue_monthly DECIMAL(12,2),
    profit_monthly DECIMAL(12,2),
    multiple DECIMAL(6,2),
    
    -- Business metrics
    age_months INTEGER,
    traffic_monthly INTEGER,
    conversion_rate DECIMAL(5,4),
    
    -- Status tracking
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    update_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_listings_external_id ON listings(external_id);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_revenue ON listings(revenue_monthly);
CREATE INDEX idx_listings_active ON listings(is_active);
CREATE INDEX idx_listings_updated ON listings(updated_at);

-- Price history table - tracks listing price changes
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    
    price DECIMAL(12,2) NOT NULL,
    revenue_monthly DECIMAL(12,2),
    profit_monthly DECIMAL(12,2),
    
    observed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID REFERENCES sessions(id)
);

CREATE INDEX idx_price_history_listing ON price_history(listing_id);
CREATE INDEX idx_price_history_observed ON price_history(observed_at);

-- =====================================================
-- PROXY MANAGEMENT
-- =====================================================

-- Proxies table - tracks all proxies
CREATE TABLE proxies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proxy_key VARCHAR(255) UNIQUE NOT NULL,
    
    -- Configuration
    provider VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- residential, datacenter, mobile
    protocol VARCHAR(10) NOT NULL, -- http, socks5
    host INET NOT NULL,
    port INTEGER NOT NULL,
    username VARCHAR(100),
    password_encrypted TEXT,
    
    -- Location
    country CHAR(2),
    city VARCHAR(100),
    isp VARCHAR(100),
    asn VARCHAR(20),
    
    -- Performance metrics
    latency_ms INTEGER,
    success_rate DECIMAL(5,4),
    total_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(50) DEFAULT 'healthy',
    last_used TIMESTAMP WITH TIME ZONE,
    last_checked TIMESTAMP WITH TIME ZONE,
    blocked_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_proxies_status ON proxies(status);
CREATE INDEX idx_proxies_country ON proxies(country);
CREATE INDEX idx_proxies_provider ON proxies(provider);
CREATE INDEX idx_proxies_last_used ON proxies(last_used);

-- Proxy usage log
CREATE TABLE proxy_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proxy_id UUID REFERENCES proxies(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    requests_made INTEGER DEFAULT 0,
    data_transferred_bytes BIGINT DEFAULT 0,
    errors_encountered INTEGER DEFAULT 0,
    
    rotation_reason VARCHAR(100)
);

CREATE INDEX idx_proxy_usage_proxy ON proxy_usage(proxy_id);
CREATE INDEX idx_proxy_usage_session ON proxy_usage(session_id);

-- =====================================================
-- ERROR TRACKING AND RECOVERY
-- =====================================================

-- Errors table - comprehensive error logging
CREATE TABLE errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Error classification
    error_type VARCHAR(50) NOT NULL,
    error_category VARCHAR(50),
    error_code VARCHAR(50),
    
    -- Error details
    message TEXT,
    stack_trace TEXT,
    context JSONB,
    
    -- Recovery information
    recovery_attempted BOOLEAN DEFAULT false,
    recovery_strategy VARCHAR(100),
    recovery_successful BOOLEAN,
    recovery_duration_ms INTEGER,
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_errors_session ON errors(session_id);
CREATE INDEX idx_errors_type ON errors(error_type);
CREATE INDEX idx_errors_occurred ON errors(occurred_at);

-- Detection events table
CREATE TABLE detection_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    detection_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    indicators JSONB,
    
    -- Response
    action_taken VARCHAR(100),
    adaptation_applied JSONB,
    
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_detection_events_session ON detection_events(session_id);
CREATE INDEX idx_detection_events_type ON detection_events(detection_type);

-- =====================================================
-- LEARNING AND ADAPTATION
-- =====================================================

-- Learning patterns table
CREATE TABLE learning_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    pattern_type VARCHAR(50) NOT NULL,
    pattern_key VARCHAR(255) NOT NULL,
    
    -- Pattern data
    pattern_data JSONB NOT NULL,
    occurrences INTEGER DEFAULT 1,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Confidence and performance
    confidence_score DECIMAL(3,2),
    avg_performance JSONB,
    
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(pattern_type, pattern_key)
);

CREATE INDEX idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX idx_learning_patterns_confidence ON learning_patterns(confidence_score);

-- Strategy performance table
CREATE TABLE strategy_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    strategy_name VARCHAR(100) NOT NULL,
    context JSONB,
    
    -- Metrics
    executions INTEGER DEFAULT 0,
    successes INTEGER DEFAULT 0,
    failures INTEGER DEFAULT 0,
    avg_duration_ms INTEGER,
    avg_data_quality DECIMAL(3,2),
    
    -- Time-based analysis
    hour_of_day INTEGER,
    day_of_week INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_strategy_performance_name ON strategy_performance(strategy_name);
CREATE INDEX idx_strategy_performance_hour ON strategy_performance(hour_of_day);

-- =====================================================
-- ANALYTICS AND REPORTING
-- =====================================================

-- Metrics snapshots table - for time-series analysis
CREATE TABLE metrics_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    interval_type VARCHAR(20) NOT NULL, -- minute, hour, day
    
    -- System metrics
    active_sessions INTEGER,
    total_requests INTEGER,
    successful_requests INTEGER,
    failed_requests INTEGER,
    
    -- Performance metrics
    avg_response_time_ms INTEGER,
    p95_response_time_ms INTEGER,
    p99_response_time_ms INTEGER,
    
    -- Data metrics
    data_extracted_count INTEGER,
    data_quality_avg DECIMAL(3,2),
    
    -- Resource metrics
    cpu_usage_percent DECIMAL(5,2),
    memory_usage_mb INTEGER,
    bandwidth_usage_mb INTEGER,
    
    -- Proxy metrics
    proxies_total INTEGER,
    proxies_healthy INTEGER,
    proxies_blocked INTEGER
);

CREATE INDEX idx_metrics_snapshots_time ON metrics_snapshots(snapshot_time);
CREATE INDEX idx_metrics_snapshots_interval ON metrics_snapshots(interval_type);

-- Alerts table
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    
    title TEXT NOT NULL,
    message TEXT,
    details JSONB,
    
    -- Alert state
    status VARCHAR(20) DEFAULT 'active',
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at);

-- =====================================================
-- AUDIT AND COMPLIANCE
-- =====================================================

-- Audit log table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    event_type VARCHAR(50) NOT NULL,
    event_action VARCHAR(50) NOT NULL,
    
    -- Who/What/When
    actor VARCHAR(100),
    target_type VARCHAR(50),
    target_id UUID,
    
    -- Details
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_event ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proxies_updated_at BEFORE UPDATE ON proxies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate session metrics
CREATE OR REPLACE FUNCTION calculate_session_metrics(session_uuid UUID)
RETURNS TABLE(
    pages_visited INTEGER,
    data_extracted INTEGER,
    errors_encountered INTEGER,
    success_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT cd.source_url)::INTEGER,
        COUNT(cd.id)::INTEGER,
        COUNT(e.id)::INTEGER,
        CASE 
            WHEN COUNT(cd.id) + COUNT(e.id) > 0 
            THEN COUNT(cd.id)::DECIMAL / (COUNT(cd.id) + COUNT(e.id))
            ELSE 1.0
        END
    FROM sessions s
    LEFT JOIN collected_data cd ON s.id = cd.session_id
    LEFT JOIN errors e ON s.id = e.session_id
    WHERE s.id = session_uuid
    GROUP BY s.id;
END;
$$ LANGUAGE plpgsql;

-- Function to update listing from collected data
CREATE OR REPLACE FUNCTION update_listing_from_data(data_id UUID)
RETURNS VOID AS $$
DECLARE
    v_data JSONB;
    v_external_id VARCHAR(255);
BEGIN
    SELECT data, data->>'external_id' 
    INTO v_data, v_external_id
    FROM collected_data 
    WHERE id = data_id;
    
    IF v_external_id IS NOT NULL THEN
        INSERT INTO listings (
            external_id, title, description, category,
            price, revenue_monthly, profit_monthly,
            age_months, traffic_monthly, raw_data
        ) VALUES (
            v_external_id,
            v_data->>'title',
            v_data->>'description',
            v_data->>'category',
            (v_data->>'price')::DECIMAL,
            (v_data->>'revenue')::DECIMAL,
            (v_data->>'profit')::DECIMAL,
            (v_data->>'age_months')::INTEGER,
            (v_data->>'traffic')::INTEGER,
            v_data
        )
        ON CONFLICT (external_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            revenue_monthly = EXCLUDED.revenue_monthly,
            profit_monthly = EXCLUDED.profit_monthly,
            last_seen = NOW(),
            update_count = listings.update_count + 1,
            raw_data = EXCLUDED.raw_data;
            
        -- Record price history if changed
        INSERT INTO price_history (listing_id, price, revenue_monthly, profit_monthly)
        SELECT id, price, revenue_monthly, profit_monthly
        FROM listings
        WHERE external_id = v_external_id
        AND (
            price IS DISTINCT FROM (v_data->>'price')::DECIMAL OR
            revenue_monthly IS DISTINCT FROM (v_data->>'revenue')::DECIMAL
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Active sessions view
CREATE VIEW v_active_sessions AS
SELECT 
    s.*,
    COUNT(DISTINCT cd.source_url) as pages_count,
    COUNT(cd.id) as data_count,
    COUNT(e.id) as error_count,
    AVG(cd.confidence_score) as avg_confidence
FROM sessions s
LEFT JOIN collected_data cd ON s.id = cd.session_id
LEFT JOIN errors e ON s.id = e.session_id
WHERE s.status = 'active'
GROUP BY s.id;

-- Proxy health view
CREATE VIEW v_proxy_health AS
SELECT 
    p.*,
    CASE 
        WHEN p.status = 'blocked' THEN 'blocked'
        WHEN p.success_rate < 0.5 THEN 'unhealthy'
        WHEN p.success_rate < 0.8 THEN 'degraded'
        ELSE 'healthy'
    END as health_status,
    COUNT(pu.id) as active_sessions
FROM proxies p
LEFT JOIN proxy_usage pu ON p.id = pu.proxy_id AND pu.ended_at IS NULL
GROUP BY p.id;

-- Recent errors view
CREATE VIEW v_recent_errors AS
SELECT 
    e.*,
    s.strategy_name,
    s.proxy_country,
    COUNT(*) OVER (PARTITION BY e.error_type ORDER BY e.occurred_at RANGE BETWEEN INTERVAL '1 hour' PRECEDING AND CURRENT ROW) as hourly_count
FROM errors e
JOIN sessions s ON e.session_id = s.id
WHERE e.occurred_at > NOW() - INTERVAL '24 hours';

-- Performance trends view
CREATE VIEW v_performance_trends AS
SELECT 
    date_trunc('hour', snapshot_time) as hour,
    AVG(avg_response_time_ms) as avg_response_time,
    AVG(CASE WHEN total_requests > 0 THEN successful_requests::DECIMAL / total_requests ELSE 0 END) as success_rate,
    SUM(data_extracted_count) as total_data_extracted,
    AVG(data_quality_avg) as avg_quality
FROM metrics_snapshots
WHERE snapshot_time > NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', snapshot_time)
ORDER BY hour;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Partial indexes for common queries
CREATE INDEX idx_sessions_active ON sessions(start_time) WHERE status = 'active';
CREATE INDEX idx_proxies_available ON proxies(last_used) WHERE status = 'healthy' AND blocked_until IS NULL;
CREATE INDEX idx_alerts_unresolved ON alerts(created_at) WHERE status = 'active' AND acknowledged = false;

-- Composite indexes for joins
CREATE INDEX idx_collected_data_composite ON collected_data(session_id, extracted_at);
CREATE INDEX idx_proxy_usage_composite ON proxy_usage(proxy_id, session_id) WHERE ended_at IS NULL;

-- =====================================================
-- PARTITIONING FOR SCALE
-- =====================================================

-- Partition collected_data by month
CREATE TABLE collected_data_2024_01 PARTITION OF collected_data
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE collected_data_2024_02 PARTITION OF collected_data
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Add more partitions as needed...

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Create roles
CREATE ROLE stealth_app;
CREATE ROLE stealth_readonly;
CREATE ROLE stealth_admin;

-- Grant permissions
GRANT USAGE ON SCHEMA stealth_collection TO stealth_app, stealth_readonly, stealth_admin;

-- App permissions (read/write)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA stealth_collection TO stealth_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA stealth_collection TO stealth_app;

-- Readonly permissions
GRANT SELECT ON ALL TABLES IN SCHEMA stealth_collection TO stealth_readonly;

-- Admin permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA stealth_collection TO stealth_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA stealth_collection TO stealth_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA stealth_collection TO stealth_admin;