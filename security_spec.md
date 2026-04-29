# Security Specification - Que Pollo Management System

## 1. Data Invariants
- A **Sale** or **Purchase** must have at least one item.
- **Product** stock cannot be negative (in theory, though business might reach zero).
- **Cash Sessions** follow a strict state machine: `open` -> `closed`. Once closed, no more movements.
- **Attendance** records must be tied to a valid employee.
- **Deboning Logs** must refer to a valid purchase of "Pollo Entero".
- **Advanced Payment** (Adelantos) cannot exceed 30% of salary.
- **Caja restriction**: After 7:00 PM, any transaction date must be the next day.

## 2. The "Dirty Dozen" Payloads (Denial Expected)
1. **Admin Escalation**: A `vendedor` user trying to update their own role in `users/{uid}` to `admin`.
2. **Negative Purchase**: A purchase with a negative total.
3. **Invalid ID**: Creating a product with an ID containing special characters like `!!!`.
4. **Shadow Field injection**: Adding `isVerified: true` to a Sale document.
5. **Session Hi-jacking**: A user trying to record a `CashMovement` to a `sessionId` that is already `closed`.
6. **Time Spoofing**: Submitting a `Sale` with a `createdAt` date from the past instead of `request.time`.
7. **Bypassing 7PM Rule**: Submitting a transaction at 8:00 PM with today's date (if server-side validation enforced).
8. **Orphaned Movement**: Creating a `CashMovement` without a parent `CashSession`.
9. **Salary Overdrive**: An employee trying to update their own salary.
10. **Partial Update Breach**: A non-admin updating the `openingBalance` of a Cash Session after it has been created.
11. **Invisible Sale**: A user reading all sales without being signed in.
12. **Attendance Forgery**: An employee creating an attendance record for another employee ID.

## 3. Test Runner (Draft)
```typescript
// firestore.rules.test.ts (Conceptual)
// We would test for:
// - PERMISSION_DENIED on anonymous access to any collection.
// - PERMISSION_DENIED on vendedor trying to update configs.
// - PERMISSION_DENIED on invalid schema writes.
```
