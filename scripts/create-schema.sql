-- Create database schema for stock trading app
USE stock_trading_app;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Create portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
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
CREATE TABLE IF NOT EXISTS holdings (
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
CREATE TABLE IF NOT EXISTS transactions (
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

-- Insert default user
INSERT IGNORE INTO users (email, name) VALUES 
('andrisetiawan@localhost', 'Andri Setiawan');

-- Create default portfolio for the user
SET @user_id = (SELECT id FROM users WHERE email = 'andrisetiawan@localhost');
INSERT IGNORE INTO portfolios (user_id, name, initial_value, cash_balance, total_value) VALUES 
(@user_id, 'Main Portfolio', 10000.00, 10000.00, 10000.00);

SELECT 'Schema created successfully!' as status;
SHOW TABLES;