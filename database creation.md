-- =========================================
-- EV Charger System Database Script
-- =========================================

-- Create database
CREATE DATABASE IF NOT EXISTS ev_system;
USE ev_system;

-- ========================
-- Users table
-- ========================

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('COMPANY_ADMIN','AGENT_ADMIN','CUSTOMER', 'AFFILIATE') DEFAULT 'CUSTOMER',
  reset_token VARCHAR(255) NULL,
  reset_token_expire DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users 
ADD COLUMN google_id VARCHAR(255) UNIQUE DEFAULT NULL,
MODIFY COLUMN password_hash VARCHAR(255) NULL;

-- ========================
-- Sample company admin
-- ========================

INSERT INTO users (name, email, password_hash, role)
VALUES ('ABC Company Admin', 'admin@abc.com', '$2b$10$7bZVBelG2XfNq/0ZfkSWXOlB8qpFUtPQ.TkWrMSfamQH9PBddF/QK', 'COMPANY_ADMIN');
-- Password is "SecurePass123!" (bcrypt hash)


-- =========================================
-- Agents table (linked to users)
-- =========================================

CREATE TABLE agents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  street_address VARCHAR(255),
  city VARCHAR(100),
  commission_percentage DECIMAL(5,2) DEFAULT 80.00,
  payable_balance DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('NEW', 'ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================
-- Sample agent
-- ========================

INSERT INTO users (name, email, password_hash, role)
VALUES ('Agent One', 'agent1@abc.com', '$2b$10$VhPqjP7cV7rBv7/qjsGdZebx5z2V9JbK5Z9h5FjWjZ6cA7J3vT/6K', 'AGENT_ADMIN');

-- Change user ID according to the user id at users table
INSERT INTO agents (user_id, contact_person, phone_number, street_address, city, status)
VALUES (3, 'John Doe', '+94 77 123 4567', '123 Main Street', 'Colombo', 'ACTIVE');

-- ========================
-- Charger Types table
-- ========================
CREATE TABLE charger_types (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model VARCHAR(100) NOT NULL,              -- e.g., "AC Type 2", "DC Fast Charger".
    brand VARCHAR(255),
    rated_power VARCHAR(100),             
    number_of_ports  INT DEFAULT 1,
    connector_data JSON,              
    current_type ENUM('AC', 'DC') DEFAULT 'AC',
    description TEXT NULL,
    datasheet TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- Sample Charger Type
-- ========================

INSERT INTO charger_types (model, rated_power, output_voltage, connector_type, number_of_ports, max_power_kw, amperage, current_type)
VALUES 
('ABC5010', '24W', '230V', 'Type 1',2, 7.4, '32A', 'AC' );


-- ========================
-- Chargers table
-- ========================
CREATE TABLE chargers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ocpp_id VARCHAR(255) UNIQUE NOT NULL,
    agent_id BIGINT NULL,
    user_id BIGINT,
    charger_type_id BIGINT NOT NULL,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    checksum VARCHAR(255),
    location VARCHAR(255),
    latitude DECIMAL(11, 8),
    longitude DECIMAL(10, 8),
    street_name VARCHAR(255) NULL,
    city VARCHAR(255) NULL,
    is_24hours_open BOOLEAN DEFAULT FALSE,       -- Whether charger operates 24/7
    opening_time TIME NULL,                      -- Opening time (if not 24 hours)
    closing_time TIME NULL,                      -- Closing time (if not 24 hours)
    status ENUM('AVAILABLE', 'PREPARING', 'PENDING','PAUSED', 'CHARGING','ERROR', 'UNAVAILABLE', 'FAULTED', 'FINISHING', 'SUSPENDEDEVSE') DEFAULT 'UNAVAILABLE',
    notes TEXT NULL,                             -- Optional notes about charger
    amenities VARCHAR(255) NULL,.
    custom_parameters JSON NULL,                 -- JSON for flexible config params
    price_per_kwh DECIMAL(10,2) NULL,            -- Charging price per kWh
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (charger_type_id) REFERENCES charger_types(id) ON DELETE RESTRICT
);

-- ========================
-- Charger connectors table 
-- ========================

CREATE TABLE connectors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    charger_id BIGINT NOT NULL, -- Physical charger ID (e.g., CP001)
    connector_id INT,        -- OCPP Connector ID (1, 2, 3...)
    status ENUM('AVAILABLE','IDLE','PENDING','PAUSED','CHARGING','ERROR','UNAVAILABLE','FAULTED','FINISHING','PREPARING','SUSPENDEDEVSE') DEFAULT 'UNAVAILABLE',
    output_voltage VARCHAR(100),             
    connector_type VARCHAR(100) NULL,        -- e.g., "Type2", "CCS2", "CHAdeMO"
    max_power_kw DECIMAL(10,2) NULL,         -- e.g., 22.0 or 50.0
    amperage VARCHAR(100),  
    active_charge_id BIGINT NULL,
    FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE
);

-- ========================
-- Charges table 
-- ========================
CREATE TABLE charges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    charger_id BIGINT NOT NULL,
    connector_id INT NOT NULL,
    customer_id BIGINT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    meter_start DECIMAL(12,5) NULL,
    meter_stop DECIMAL(12,5) NULL,
    current_reading DECIMAL(12,5) NULL,
    amount DECIMAL(10,2) NULL,
    est_cost DECIMAL(10,2) NULL,
    status ENUM('PENDING', 'CHARGING','COMPLETED', 'PAUSED', 'CANCELLED') DEFAULT 'PENDING',
    vehicle_number VARCHAR(255),
    ocpp_transaction_id INT NULL,
    note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
);


ALTER TABLE connectors
ADD CONSTRAINT fk_active_charge
FOREIGN KEY (active_charge_id) REFERENCES charges(id) ON DELETE SET NULL;


-- ========================
-- Customer wallet table
-- ========================
CREATE TABLE wallets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ========================
-- Wallet transactions
-- ========================

CREATE TABLE wallet_transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    wallet_id BIGINT NOT NULL,
    charge_id BIGINT NULL, 
    amount DECIMAL(10,2) NOT NULL,
    reference_id VARCHAR(255),
    status ENUM('SUCCESS', 'FAILED', 'PENDING'),
    type ENUM('TOPUP', 'PAYMENT', 'REFUND') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
    FOREIGN KEY (charge_id) REFERENCES charges(id) ON DELETE SET NULL
);

-- ========================
-- Community (Crowdsourced) Chargers Table
-- ========================
CREATE TABLE community_chargers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    submitted_by BIGINT NOT NULL,          -- who added this (Customer ID)
    place_name VARCHAR(255) NOT NULL,      -- location name(eg: Liberty Plaza Parking)
    description TEXT,                       -- description (eg: Near Gate 2)
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,      
    charger_network VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,     --  whether confirmed by an admin
    image_url VARCHAR(500) NULL,           -- sample photo 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE community_charger_connectors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    charger_id BIGINT NOT NULL,
    connector_type VARCHAR(100) NOT NULL,
    charger_capacity VARCHAR(50),
    FOREIGN KEY (charger_id) REFERENCES community_chargers(id) ON DELETE CASCADE
);

-- ========================
-- Customers table
-- ========================

CREATE TABLE customers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  phone_number VARCHAR(20),
  vehicle_model VARCHAR(100),
  vehicle_number VARCHAR(50),
  address TEXT,
  nic VARCHAR(20),
  passport_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



<!-- Renting -->

    CREATE TABLE IF NOT EXISTS vehicle_models (
        model_id INT AUTO_INCREMENT PRIMARY KEY,
        model_name VARCHAR(100) NOT NULL,
        brand VARCHAR(50) NOT NULL,
        battery_capacity VARCHAR(50),
        category ENUM('scooter', 'bike', 'car', 'tuktuk'),
        ac_connector_type VARCHAR(50) COMMENT 'Type of the charging connector',
        dc_connector_type VARCHAR(50) COMMENT 'Type of the charging connector',
        deposit DECIMAL(10, 2),
        top_speed INT,
        range_per_charge INT,
        base_price_per_day DECIMAL(10, 2) NOT NULL,
        image_url VARCHAR(255),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
        model_id INT,
        plate_number VARCHAR(20) UNIQUE NOT NULL,
        current_status ENUM('available', 'maintenance', 'rented') DEFAULT 'available',
        last_service_date DATE,
        FOREIGN KEY (model_id) REFERENCES vehicle_models(model_id) ON DELETE CASCADE
    );

    ALTER TABLE vehicles 
    ADD COLUMN owner_id BIGINT NULL;
    ALTER TABLE vehicles 
    ADD CONSTRAINT fk_vehicle_owner 
    FOREIGN KEY (owner_id) REFERENCES users(id) 
    ON DELETE SET NULL;


    CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT, 
    vehicle_id INT,
    pickup_date DATETIME NOT NULL,
    pickup_time TIME NOT NULL,
    dropoff_date DATETIME NOT NULL,
    dropoff_time TIME NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    booking_status ENUM('pending', 'confirmed', 'ongoing', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('card', 'cash', 'bank_transfer', 'payhere') NOT NULL,
    transaction_id VARCHAR(100), -- Gateway එකෙන් එන reference එක
    payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rental_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    user_id BIGINT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pickup_locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,
    price INT
);

-- payout table to store Superadmin payouts to the agents

CREATE TABLE payouts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'PAID', 'REVERTED') DEFAULT 'PENDING',
    paid_at TIMESTAMP NULL,
    reverted_at TIMESTAMP NULL,
    receipt_url VARCHAR(500),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- agent_earnings to save earnings for agents via their charger usage 

CREATE TABLE agent_earnings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL,
    charge_id BIGINT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL, 
    commission_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ocpp_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    charge_point_id VARCHAR(50),
    message_type VARCHAR(50),
    direction ENUM('INCOMING', 'OUTGOING'),
    payload JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (charge_point_id),
    INDEX (created_at)
);

CREATE TABLE affiliate_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    points_pct_charging INT DEFAULT 5,
    points_pct_renting INT DEFAULT 10,
    current_points INT DEFAULT 0,
    total_points_earned INT DEFAULT 0,
    status ENUM('ACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    affiliate_id INT NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL, 
    discount_pct DECIMAL(5,2) NOT NULL, 
    max_uses_per_user INT DEFAULT 1, 
    expiry_date DATETIME NULL, 
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE
);

CREATE TABLE coupon_usages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT NOT NULL,
    customer_id BIGINT NOT NULL,
    charge_id BIGINT NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (charge_id) REFERENCES charges(id)
);

CREATE TABLE redeemable_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(50) NOT NULL, 
    points_required INT NOT NULL, 
    actual_value DECIMAL(10,2) NOT NULL, 
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE point_redemptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    affiliate_id INT NOT NULL,
    package_id INT NOT NULL,
    points_deducted INT NOT NULL,
    status ENUM('REQUESTED', 'REDEEMED') DEFAULT 'REQUESTED',
    wallet_value_added DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (affiliate_id) REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES redeemable_packages(id)
);

ALTER TABLE charges 
ADD COLUMN applied_coupon_id INT NULL AFTER customer_id,
ADD COLUMN affiliate_points_earned INT DEFAULT 0 AFTER applied_coupon_id,
ADD CONSTRAINT fk_charges_coupon FOREIGN KEY (applied_coupon_id) REFERENCES coupons(id);