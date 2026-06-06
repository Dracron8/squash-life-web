-- Update payment_status values: rename 'pending' → 'waitlist'
-- New values: 'waitlist' | 'deposit_paid' | 'fully_paid'

ALTER TABLE registrations ALTER COLUMN payment_status SET DEFAULT 'waitlist';

UPDATE registrations
SET payment_status = 'waitlist'
WHERE payment_status = 'pending';
