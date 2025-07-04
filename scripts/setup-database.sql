-- Stock Trading App Database Setup
-- Run this as root user: mysql -u root -p < setup-database.sql

-- Create the database
CREATE DATABASE IF NOT EXISTS stock_trading_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated application user
CREATE USER IF NOT EXISTS 'stock_trader'@'localhost' IDENTIFIED BY 'St0ckTr@d3r2024!';

-- Grant privileges only to the specific database
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON stock_trading_app.* TO 'stock_trader'@'localhost';

-- Remove any global privileges (security best practice)
REVOKE ALL PRIVILEGES ON *.* FROM 'stock_trader'@'localhost';

-- Flush privileges to ensure changes take effect
FLUSH PRIVILEGES;

-- Use the new database
USE stock_trading_app;

-- Create users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Create portfolios table
CREATE TABLE portfolios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Main Portfolio',
    initial_value DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    cash_balance DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    total_value DECIMAL(15,2) NOT NULL DEFAULT 10000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_active (is_active)
);

-- Create holdings table
CREATE TABLE holdings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    average_price DECIMAL(15,4) NOT NULL,
    current_price DECIMAL(15,4) DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    profit_loss DECIMAL(15,2) DEFAULT 0,
    profit_loss_percent DECIMAL(8,4) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_portfolio_symbol (portfolio_id, symbol),
    INDEX idx_portfolio_id (portfolio_id),
    INDEX idx_symbol (symbol)
);

-- Create transactions table
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    portfolio_id INT NOT NULL,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    symbol VARCHAR(10) NOT NULL,
    type ENUM('BUY', 'SELL') NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    ai_recommendation JSON,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE,
    INDEX idx_portfolio_id (portfolio_id),
    INDEX idx_symbol (symbol),
    INDEX idx_type (type),
    INDEX idx_transaction_date (transaction_date)
);

-- Create AI recommendations cache table (for daily suggestions)
CREATE TABLE ai_recommendations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(255),
    action ENUM('BUY', 'SELL', 'HOLD') NOT NULL,
    confidence DECIMAL(5,2) NOT NULL,
    current_price DECIMAL(15,4),
    target_price DECIMAL(15,4),
    expected_return DECIMAL(8,4),
    reasoning TEXT,
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH'),
    timeframe ENUM('SHORT', 'MEDIUM', 'LONG'),
    key_factors JSON,
    market_data JSON,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_generated_at (generated_at),
    INDEX idx_expires_at (expires_at)
);

-- Create user sessions table (optional, for better session management)
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    access_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires_at (expires_at)
);

-- Insert default user (andrisetiawan)
INSERT INTO users (email, name) VALUES 
('andrisetiawan@example.com', 'Andri Setiawan')
ON DUPLICATE KEY UPDATE name = 'Andri Setiawan';

-- Get the user ID and create default portfolio
SET @user_id = (SELECT id FROM users WHERE email = 'andrisetiawan@example.com');
INSERT INTO portfolios (user_id, name, initial_value, cash_balance, total_value) VALUES 
(@user_id, 'Main Portfolio', 10000.00, 10000.00, 10000.00)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Show final setup information
SELECT 'Database setup completed successfully!' as Status;
SELECT 'Database: stock_trading_app' as Database_Name;
SELECT 'User: stock_trader@localhost' as Database_User;
SELECT 'Password: St0ckTr@d3r2024!' as Database_Password;

-- Show created tables
SHOW TABLES;