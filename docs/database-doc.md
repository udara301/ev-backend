
-------------------------------------------

**Entities & Relationships**

-------------------------------------------

**Users**

Fields: id (PK), name, email, password_hash, role, reset_token, reset_token_expire, created_at

Roles: COMPANY_ADMIN, AGENT_ADMIN, CUSTOMER

Relationships:

- One-to-many with Chargers (if role = AGENT_ADMIN)

- One-to-many with Charges (if role = CUSTOMER)

- One-to-one with Wallet (if role = CUSTOMER)

-------------------------------------------

**Chargers**

Fields: id (PK), agent_id (FK → users.id), serial_number, location, status, last_charge_start, last_charge_end, last_charge_amount, created_at

Relationships:

Many-to-one with Users (Agent)

One-to-many with Charges

-------------------------------------------

**Charges**

Fields: id (PK), charger_id (FK → chargers.id), customer_id (FK → users.id), start_time, end_time, amount, status, created_at

Relationships:

Many-to-one with Chargers

Many-to-one with Users (Customer)

-------------------------------------------

**Wallets**

Fields: id (PK), customer_id (FK → users.id), balance, updated_at

Relationships:

One-to-one with Users (Customer)

-------------------------------------------

**ER Diagram**

```
┌───────────┐       1       ┌───────────┐       1       ┌─────────┐
│  Users    │──────────────>│ Chargers  │──────────────>│ Charges │
│(Agents,   │  agent_id     │agent_id   │  charger_id   │charger_id
│ Customers)│               │           │               │customer_id
└───────────┘               └───────────┘               └─────────┘
      │
      │ 1
      │
      ▼
  ┌─────────┐
  │ Wallets │
  │customer_id
  └─────────┘

```

| From | To | Type	| Description |
| -------- | ------- | -------- | ------- |
| Users	| Chargers |	1:N |	Agent can have multiple chargers |
|Chargers |	Charges |	1:N	| Each charger can have multiple charging sessions |
| Users	| Charges	| 1:N	| Customer can have multiple charges |
| Users	| Wallets	| 1:1	| Each customer has a wallet |
