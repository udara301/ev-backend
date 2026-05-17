# OCPP Developer Guide

> **Protocol version:** OCPP 1.6 JSON (WebSocket-based)

---

## 1. What is OCPP?

OCPP (Open Charge Point Protocol) is the communication protocol between a **Charge Point** (the physical EV charger) and a **Central System** (this backend). Every message travels over a persistent WebSocket connection initiated by the charger.

This backend acts as the **Central System**.

---

## 2. High-Level Architecture

```
┌──────────────────────┐        WebSocket (port 8080)       ┌──────────────────────────┐
│   Physical Charger   │ ─────────────────────────────────▶ │  centralSystem.js        │
│  (OCPP 1.6 device)   │ ◀───────────────────────────────── │  (OCPP WebSocket Server) │
└──────────────────────┘                                     └──────────┬───────────────┘
                                                                        │ routes to
                                                             ┌──────────▼───────────────┐
                                                             │  ocppHandlers.js         │
                                                             │  (action dispatcher)     │
                                                             └───┬──────────┬───────────┘
                                                                 │          │
                                                    ┌────────────▼──┐  ┌───▼─────────────────┐
                                                    │  ocppSender.js│  │  charges.controller  │
                                                    │  (outbound    │  │  charger.service     │
                                                    │   commands)   │  │  wallet.service      │
                                                    └───────────────┘  └──────────────────────┘
                                                                                │
                                                                 ┌──────────────▼──────────────┐
                                                                 │  frontendws.js               │
                                                                 │  (WebSocket port 8081)       │
                                                                 │  Pushes real-time events     │
                                                                 │  to the mobile/web frontend  │
                                                                 └─────────────────────────────┘
```

There are **two** WebSocket servers running simultaneously:

| Server | Port | Purpose |
|---|---|---|
| `centralSystem.js` | **8080** | Talks to physical chargers via OCPP |
| `frontendws.js` | **8081** | Pushes real-time notifications to authenticated app clients |

---

## 3. File Responsibilities

| File | Role |
|---|---|
| `src/ocpp/centralSystem.js` | Bootstraps the OCPP WebSocket server, tracks connected chargers, dispatches incoming messages to `ocppHandlers.js` |
| `src/ocpp/ocppHandlers.js` | **Main logic hub.** Handles every OCPP action: BootNotification, Heartbeat, StatusNotification, StartTransaction, StopTransaction, MeterValues |
| `src/ocpp/ocppSender.js` | Sends **outbound** OCPP commands (RemoteStartTransaction, RemoteStopTransaction) from the server to the charger |
| `src/controllers/ocppController.js` | DB helpers for updating `chargers` and `connectors` table statuses |
| `src/controllers/charges.controller.js` | DB helpers and HTTP endpoints for charge session management |
| `src/services/charger.service.js` | Read/update helpers for the `chargers` table |
| `src/services/wallet.service.js` | Wallet balance reads and deductions (includes agent commission logic) |
| `src/websocket/frontendws.js` | JWT-authenticated WebSocket server for the frontend app |

---

## 4. OCPP Message Format

OCPP 1.6 uses a 4-element JSON array:

```json
// Request  (msgType = 2) — sent by the charger
[2, "<unique-id>", "<Action>", { ...payload }]

// Response (msgType = 3) — sent by the server
[3, "<unique-id>", { ...response }]

// Error    (msgType = 4) — sent by the server on failure
[4, "<unique-id>", "<ErrorCode>", "<description>", {}]
```

The `<unique-id>` (called `uid` in the code) lets the charger match responses back to its own requests.

---

## 5. Charger Connection Lifecycle

### 5.1 Charger Connects (`centralSystem.js`)

When a charger opens a WebSocket connection to `ws://<server>:8080/<chargePointId>`:

1. The `chargePointId` is extracted from the URL path (`req.url`).
2. The connection is stored in the `connectedChargers` Map: `chargePointId → ws`.
3. All subsequent messages from this charger are parsed and routed to `handleOcppRequest()`.

```js
// centralSystem.js (simplified)
connectedChargers.set(chargePointId, ws);  // register live connection

ws.on("message", async (msg) => {
    const [msgType, uid, action, payload] = JSON.parse(msg);
    if (msgType === 2) {
        await handleOcppRequest({ ws, uid, action, payload, chargePointId });
    }
});
```

> **Important:** `chargePointId` in the OCPP layer corresponds to the charger's `id` column in the `chargers` database table.

### 5.2 Charger Disconnects

When the WebSocket closes, `setChargerUnavailable(chargePointId)` is called automatically, which sets both the charger row and all its connectors to `UNAVAILABLE` in the database.

---

## 6. OCPP Action Handlers (`ocppHandlers.js`)

All incoming OCPP messages are dispatched here via a `switch(action)` block.

### 6.1 BootNotification

Sent by the charger on power-up or reconnect.

**Handler actions:**
- Calls `setChargerIdle(chargePointId)` → sets charger `status = AVAILABLE` and all connectors to `AVAILABLE`.
- Responds with `{ status: "Accepted", currentTime, interval: 300 }`.

---

### 6.2 Heartbeat

Periodic keep-alive from the charger (every `interval` seconds defined in BootNotification response).

**Handler actions:**
- Responds with `{ currentTime }`. No DB write.

---

### 6.3 StatusNotification

Sent when any connector's status changes (e.g. becomes `AVAILABLE`, `CHARGING`, `FAULTED`).

**Handler actions:**
- If `connectorId > 0` (a real connector, not the whole charger): calls `updateConnectorStatus(chargePointId, connectorId, status)` to update the `connectors` table.
- `connectorId = 0` represents the charger unit itself — currently logged but not acted on separately.
- Responds with `{}`.

---

### 6.4 StartTransaction ⚡ (most complex)

Sent by the charger when a charging session physically begins — either after receiving a `RemoteStartTransaction` command or from a local RFID tap.

**Handler flow:**

```
1. Look up charger record from DB using chargePointId
2. Look for an existing PENDING or CHARGING session for this connector
   ├─ Found  → update it: set status=CHARGING, store meter_start and ocpp_transaction_id
   └─ Not found → create a new charge record (unknown/manual start, customer_id = null)
3. Set connector: status=CHARGING, active_charge_id=charge.id
4. Respond to charger: { transactionId: charge.id, idTagInfo: { status: "Accepted" } }
5. Push "charging_started" event to charger owner via frontendws.js
```

> **Key design decision:** The `transactionId` this backend returns IS the database `charge.id`. This is how subsequent `StopTransaction` and `MeterValues` messages are linked back to the correct DB row — they include this `transactionId` which is looked up via `ocpp_transaction_id` on the `charges` table.

---

### 6.5 StopTransaction 🛑

Sent by the charger when a session ends (either from `RemoteStopTransaction` or a physical stop).

**Handler flow:**

```
1. Find the charge record: SELECT * FROM charges WHERE ocpp_transaction_id = payload.transactionId
2. Calculate: energyUsed = meterStop - charge.meter_start
3. Calculate: cost = energyUsed × charger.price_per_kwh
4. Update charge row: end_time, meter_stop, amount, status=COMPLETED
5. Clear connector: active_charge_id=null, status=null
   (the next StatusNotification from the charger will set the real status)
6. If customer_id is set AND cost > 0 AND user role = CUSTOMER:
   → walletService.deductBalance() — handles deduction + agent commission in one transaction
7. Push "charging_stopped" event to charger owner via frontendws.js
8. Respond to charger: { idTagInfo: { status: "Accepted" } }
```

---

### 6.6 MeterValues 📊

Sent periodically during an active session with live energy meter readings.

**Handler flow:**

```
1. Extract the Energy.Active.Import.Register measurand value from the payload
2. updateMeterReadings(txId, currentReading) → updates meter_stop in charges table
3. Calculate energyConsumedKwh = currentReading - charge.meter_start
4. Calculate currentCost = energyConsumedKwh × charger.price_per_kwh
5. If user role = CUSTOMER:
   → getBalance() from wallet
   → If (balance - estimatedCost) ≤ 10 LKR (low balance threshold):
      ├─ sendRemoteStop(chargePointId, txId)    ← automatic emergency stop
      └─ Push "charging_stopped" alert to customer (charge.customer_id)
6. Push "meter_update" event to charger owner (charger.user_id) via frontendws.js
7. Respond to charger: {}
```

---

## 7. Outbound Commands (`ocppSender.js`)

The server can push commands to a connected charger. Both functions look up the live WebSocket connection from the `connectedChargers` Map and return `false` if the charger is offline.

### RemoteStartTransaction

```js
sendRemoteStart(chargePointId, idTag, connectorId)
```

Called from: `charges.controller.js → startCharging()` (triggered by HTTP POST from the frontend).

### RemoteStopTransaction

```js
sendRemoteStop(chargePointId, transactionId)
```

Called from:
- `charges.controller.js → stopCharging()` (triggered by HTTP POST from the frontend).
- `ocppHandlers.js → MeterValues` (automatic stop when wallet balance is critically low).

> If the charger is offline (not in `connectedChargers`), both functions return `false`. The caller is responsible for marking the charger/connector as `UNAVAILABLE` and failing the request gracefully.

---

## 8. Full Charging Session Lifecycle

```
Frontend App              Backend HTTP (:3000)        OCPP WS (:8080)        Frontend WS (:8081)
     │                           │                          │                        │
     │  POST /charges/start      │                          │                        │
     │──────────────────────────▶│                          │                        │
     │                           │ wallet balance check     │                        │
     │                           │ INSERT charge (PENDING)  │                        │
     │                           │ connector → PENDING      │                        │
     │                           │─── RemoteStartTransaction ──────────────────────▶│(charger)
     │  201 { charge_id }        │                          │                        │
     │◀──────────────────────────│                          │                        │
     │                           │                   StartTransaction                │
     │                           │◀─────────────────────────│                        │
     │                           │ charge → CHARGING        │                        │
     │                           │ connector → CHARGING     │                        │
     │                           │─── [3, uid, {txId}] ────▶│                        │
     │                           │                          │──── charging_started ─▶│
     │                           │                          │                        │
     │                           │               MeterValues (periodic)              │
     │                           │◀─────────────────────────│                        │
     │                           │ update meter_stop        │                        │
     │                           │ check wallet balance     │                        │
     │                           │─── [3, uid, {}] ────────▶│                        │
     │                           │                          │──── meter_update ──────▶│
     │                           │                          │                        │
     │  POST /charges/stop       │                          │                        │
     │──────────────────────────▶│                          │                        │
     │                           │─── RemoteStopTransaction ───────────────────────▶│(charger)
     │  200 { stop command sent }│                          │                        │
     │◀──────────────────────────│                          │                        │
     │                           │                   StopTransaction                 │
     │                           │◀─────────────────────────│                        │
     │                           │ charge → COMPLETED       │                        │
     │                           │ deduct wallet            │                        │
     │                           │ agent commission         │                        │
     │                           │─── [3, uid, {}] ────────▶│                        │
     │                           │                          │──── charging_stopped ──▶│
```

---

## 9. Frontend WebSocket Events (`frontendws.js`)

The frontend connects to `ws://<server>:8081?token=<JWT>`. The backend verifies the JWT and registers the user. Only one active connection per user is allowed (the old one is closed on re-connect).

Events pushed from the backend:

| `type` | Sent when | Key payload fields | Recipient |
|---|---|---|---|
| `connection_established` | On connect | `userId`, `userInfo` | Connecting user |
| `charging_started` | `StartTransaction` handled | `chargerId`, `connectorId`, `chargeId`, `meterStart` | Charger owner (`charger.user_id`) |
| `meter_update` | Each `MeterValues` message | `amount`, `energyUsed`, `durationSeconds`, `timestamp` | Charger owner |
| `charging_stopped` | `StopTransaction` handled | `amount`, `energyUsed`, `meterStop` | Charger owner |
| `charging_stopped` (low balance) | Wallet ≤ 10 LKR during `MeterValues` | `message`, `currentBalance`, `estimatedCost` | Customer (`charge.customer_id`) |

---

## 10. Database Tables Involved

| Table | What the OCPP flow writes |
|---|---|
| `chargers` | `status` — `AVAILABLE` on boot, `UNAVAILABLE` on disconnect |
| `connectors` | `status`, `active_charge_id` — updated on every transaction event |
| `charges` | Created on start, updated with meter/time/cost, finalised on stop |
| `wallets` | `balance` deducted on StopTransaction (CUSTOMER role only) |
| `wallet_transactions` | PAYMENT row inserted per completed charge |
| `agents` | `payable_balance` incremented by commission amount |
| `agent_earnings` | Audit row per completed charge for reporting |

---

## 11. Key Business Rules

1. **Minimum wallet balance to start:** 200 LKR — enforced in `startCharging()` HTTP handler before any OCPP command is sent.
2. **Auto-stop threshold:** If `(balance - estimated_cost) ≤ 10 LKR` during a `MeterValues` event, `RemoteStopTransaction` is sent automatically and the customer is notified.
3. **Agent commission:** Calculated at stop time as `total_cost × (commission_percentage / 100)`. The percentage is stored on the `agents` table and linked to chargers via `chargers.agent_id`.
4. **Unknown / RFID starts:** If `StartTransaction` arrives without a matching PENDING session in the DB (e.g. physical card tap), a new charge is created with `customer_id = null` and `note = "UNKNOWN - Started via OCPP without pending session"`. No wallet deduction occurs for these.
5. **Connector vs. charger status:** The `chargers.status` column is only touched on boot/disconnect. The `connectors.status` column is updated by `StatusNotification` and transaction events — this is the authoritative per-port state.

---

## 12. Adding a New OCPP Action

1. Add a new `case "ActionName":` block in `src/ocpp/ocppHandlers.js`.
2. Always end the case with either:
   - `ws.send(JSON.stringify([3, uid, { ...response }]));` on success
   - `ws.send(JSON.stringify([4, uid, "ErrorCode", "description", {}]));` on error
3. If the new action requires sending a **server-initiated** command to the charger, add a new export function in `src/ocpp/ocppSender.js`.
4. If new charger or connector state needs persisting, add DB helper functions in `src/controllers/ocppController.js` or the appropriate service file.

---

## 13. Running Locally

```bash
# Install dependencies
npm install

# Start the server (OCPP server boots automatically via the import in server.js)
node src/server.js
```

| Endpoint | URL |
|---|---|
| REST API | `http://localhost:3000/api/v1/...` |
| Swagger docs | `http://localhost:3000/api-docs` |
| OCPP WebSocket (chargers) | `ws://localhost:8080/<chargePointId>` |
| Frontend WebSocket (app) | `ws://localhost:8081?token=<JWT>` |
