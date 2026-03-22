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
  role ENUM('COMPANY_ADMIN','AGENT_ADMIN','CUSTOMER') DEFAULT 'CUSTOMER',
  reset_token VARCHAR(255) NULL,
  reset_token_expire DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    model VARCHAR(100) NOT NULL,              -- e.g., "AC Type 2", "DC Fast Charger"
    input_voltage VARCHAR(100),             
    number_of_ports  INT DEFAULT 1,              
    current_type ENUM('AC', 'DC') DEFAULT 'AC',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- Sample Charger Type
-- ========================

INSERT INTO charger_types (model, input_voltage, output_voltage, connector_type, number_of_ports, max_power_kw, amperage, current_type)
VALUES 
('ABC5010', '230V', '230V', 'Type 1',2, 7.4, '32A', 'AC' );


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
    notes TEXT NULL,                             -- Optional notes about charger
    amenities VARCHAR(255) NULL,.
    custom_parameters JSON NULL,                 -- JSON for flexible config params
    price_per_kwh DECIMAL(10,2) NULL,            -- Charging price per kWh
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (charger_type_id) REFERENCES charger_types(id) ON DELETE RESTRICT
);

-- ========================
-- Charger connectors table 
-- ========================

CREATE TABLE connectors (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    charger_id BIGINT NOT NULL, -- Physical charger ID (e.g., CP001)
    connector_id INT,        -- OCPP Connector ID (1, 2, 3...)
    status ENUM('IDLE', 'PENDING','PAUSED', 'CHARGING','ERROR', 'UNAVAILABLE', 'FAULTED', 'FINISHING') DEFAULT 'IDLE',
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
    charge_id BIGINT NULL, -- චාජ් එකකට කැපුණු සල්ලි නම්
    amount DECIMAL(10,2) NOT NULL,
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
    connector_type VARCHAR(100),            -- Type 2, CCS2 
    is_verified BOOLEAN DEFAULT FALSE,     --  whether confirmed by an admin
    image_url VARCHAR(500) NULL,           -- sample photo 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



<!-- Renting -->

    CREATE TABLE IF NOT EXISTS vehicle_models (
        model_id INT AUTO_INCREMENT PRIMARY KEY,
        model_name VARCHAR(100) NOT NULL,
        brand VARCHAR(50) NOT NULL,
        battery_capacity VARCHAR(50),
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
    dropoff_date DATETIME NOT NULL,
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
    payment_method ENUM('card', 'cash', 'bank_transfer') NOT NULL,
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
