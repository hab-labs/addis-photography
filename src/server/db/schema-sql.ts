export const SCHEMA_SQL = `-- Addis Photography Studio Management & Album System — PostgreSQL Schema
-- Specification Version 2.0 Compliance (Section 8.1 & 8.2)

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(32) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users (Staff and Administrators)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    username VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(32) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(32) NOT NULL REFERENCES roles(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_pw BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMPTZ NULL,
    last_login TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NULL,
    notes TEXT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 4. Photo Types & Standard Prices
CREATE TABLE IF NOT EXISTS photo_types (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    standard_price NUMERIC(12, 2) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    turnaround_days INT NOT NULL DEFAULT 1,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Orders (Bookings)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id),
    order_date DATE NOT NULL,
    booking_no INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'New',
    notes TEXT NULL,
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    voided BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason TEXT NULL,
    voided_at TIMESTAMPTZ NULL,
    voided_by VARCHAR(64) NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_orders_date_booking_no UNIQUE (order_date, booking_no)
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    photo_type_id VARCHAR(64) NOT NULL REFERENCES photo_types(id),
    photo_type_name VARCHAR(64) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 7. Payments
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    method VARCHAR(32) NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_date DATE NOT NULL,
    reference_no VARCHAR(128) NULL,
    note TEXT NULL,
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    voided BOOLEAN NOT NULL DEFAULT FALSE,
    void_reason TEXT NULL,
    voided_at TIMESTAMPTZ NULL,
    voided_by VARCHAR(64) NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- 8. Customer Requests
CREATE TABLE IF NOT EXISTS requests (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id),
    order_id VARCHAR(64) NULL REFERENCES orders(id),
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Received',
    due_date TIMESTAMPTZ NOT NULL,
    assigned_to VARCHAR(64) NULL REFERENCES users(id),
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_customer_id ON requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_due_date ON requests(due_date);

-- 9. Albums
CREATE TABLE IF NOT EXISTS albums (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL REFERENCES customers(id),
    title VARCHAR(255) NOT NULL,
    occasion VARCHAR(64) NOT NULL DEFAULT 'General',
    event_date DATE NOT NULL,
    visibility VARCHAR(32) NOT NULL DEFAULT 'Public',
    pin_hash VARCHAR(255) NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    allow_download BOOLEAN NOT NULL DEFAULT FALSE,
    allow_zip BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    quota_mb INT NOT NULL DEFAULT 1024,
    status VARCHAR(32) NOT NULL DEFAULT 'Draft',
    cover_url VARCHAR(512) NULL,
    created_by VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_albums_token ON albums(token);
CREATE INDEX IF NOT EXISTS idx_albums_expires_at ON albums(expires_at);

-- 10. Media Files
CREATE TABLE IF NOT EXISTS media (
    id VARCHAR(64) PRIMARY KEY,
    album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    path_web VARCHAR(512) NOT NULL,
    path_thumb VARCHAR(512) NULL,
    size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'processing',
    data_url TEXT NULL,
    width INT NULL,
    height INT NULL,
    duration_seconds INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_album_id ON media(album_id);

-- 11. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NULL REFERENCES users(id),
    user_name VARCHAR(120) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(64) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 12. Studio Settings
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 14. Public Album Unlock Sessions
CREATE TABLE IF NOT EXISTS album_unlock_sessions (
    id VARCHAR(128) PRIMARY KEY,
    album_id VARCHAR(64) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_album_unlock_sessions_token ON album_unlock_sessions(token);
CREATE INDEX IF NOT EXISTS idx_album_unlock_sessions_expires_at ON album_unlock_sessions(expires_at);
`;
