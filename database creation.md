-- =========================================
-- EV Charger System Database Script
-- =========================================

-- Create database
CREATE DATABASE IF NOT EXISTS ev_system;
USE ev_system;

-- ========================
-- Users table
-- ========================

user table

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
VALUES ('ABC Company Admin', 'admin@abc.com', '$2b$10$VhPqjP7cV7rBv7/qjsGdZebx5z2V9JbK5Z9h5FjWjZ6cA7J3vT/6K', 'COMPANY_ADMIN');
-- Password is "admin123" (bcrypt hash)


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
    output_voltage VARCHAR(100),             
    connector_type VARCHAR(100) NULL,        -- e.g., "Type2", "CCS2", "CHAdeMO"
    max_power_kw DECIMAL(10,2) NULL,         -- e.g., 22.0 or 50.0
    amperage VARCHAR(100),                
    current_type ENUM('AC', 'DC') DEFAULT 'AC',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- Sample Charger Type
-- ========================

INSERT INTO charger_types (model, input_voltage, output_voltage, connector_type, max_power_kw, amperage, current_type)
VALUES 
('ABC5010', '230V', '230V', 'Type 1', 7.4, '32A', 'AC' );


-- ========================
-- Chargers table
-- ========================
CREATE TABLE chargers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT,
    charger_type_id BIGINT NOT NULL,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    checksum VARCHAR(255),
    name VARCHAR(255),
    location VARCHAR(255),
    street_name VARCHAR(255) NULL,
    city VARCHAR(255) NULL,
    status ENUM('IDLE', 'PENDING','PAUSED', 'CHARGING','ERROR') DEFAULT 'IDLE',
    last_charge_start DATETIME NULL,
    last_charge_end DATETIME NULL,
    last_charge_amount DECIMAL(10,2) NULL,
    active_charge_id BIGINT NULL,
    is_24hours_open BOOLEAN DEFAULT FALSE,       -- Whether charger operates 24/7
    opening_time TIME NULL,                      -- Opening time (if not 24 hours)
    closing_time TIME NULL,                      -- Closing time (if not 24 hours)
    notes TEXT NULL,                             -- Optional notes about charger
    custom_parameters JSON NULL,                 -- JSON for flexible config params
    price_per_kwh DECIMAL(10,2) NULL,            -- Charging price per kWh
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (charger_type_id) REFERENCES charger_types(id) ON DELETE RESTRICT,
    FOREIGN KEY (active_charge_id) REFERENCES charges(id) ON DELETE SET NULL
);

-- ========================
-- Sample charger for agent
-- ========================
INSERT INTO chargers (agent_id, serial_number, location)
VALUES (2, 'CHG-001-XYZ', 'Colombo 03');

-- ========================
-- Charges table 
-- ========================
CREATE TABLE charges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    charger_id BIGINT NOT NULL,
    customer_id BIGINT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NULL,
    meter_start DECIMAL(12,5) NULL,
    meter_stop DECIMAL(12,5) NULL,
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