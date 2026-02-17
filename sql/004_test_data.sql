-- Test data for verifying the estimate detail view
-- Run in Supabase SQL Editor, then delete when done testing

DO $$
DECLARE
  v_user_id uuid;
  v_customer_id uuid := gen_random_uuid();
  v_estimate_id uuid := gen_random_uuid();
BEGIN
  -- Get your user ID
  SELECT id INTO v_user_id FROM users WHERE email = 'wylee@genesisservices.com';

  -- Test customer
  INSERT INTO customers (id, name, email, phone, address, equipment_type)
  VALUES (v_customer_id, 'John Smith', 'john.smith@example.com', '+14255551234', '123 Main St, Monroe, WA 98272', 'Carrier 3-ton AC');

  -- Test estimate
  INSERT INTO estimates (id, estimate_number, customer_id, assigned_to, status, total_amount, sent_date, sequence_step_index)
  VALUES (v_estimate_id, 'EST-1001', v_customer_id, v_user_id, 'active', 8500, now() - interval '10 days', 3);

  -- Estimate options
  INSERT INTO estimate_options (estimate_id, option_number, description, amount, status) VALUES
    (v_estimate_id, 1, 'Replace condenser unit', 5200, 'pending'),
    (v_estimate_id, 2, 'Add UV air purifier', 1800, 'pending'),
    (v_estimate_id, 3, 'Full system replacement', 8500, 'pending');

  -- Follow-up events (mix of statuses to show timeline)
  INSERT INTO follow_up_events (estimate_id, sequence_step_index, channel, status, scheduled_at, sent_at, content, comfort_pro_edited) VALUES
    (v_estimate_id, 0, 'sms', 'sent', now() - interval '10 days', now() - interval '10 days',
     'Hi John, this is Wylee from Genesis HVAC. I just sent over your estimate — let me know if you have any questions!', false),
    (v_estimate_id, 1, 'email', 'opened', now() - interval '9 days', now() - interval '9 days',
     'Following up on your estimate for the Carrier 3-ton AC replacement.', false),
    (v_estimate_id, 2, 'call', 'completed', now() - interval '7 days', now() - interval '7 days',
     'Called customer, left voicemail. Will try again next week.', true),
    (v_estimate_id, 3, 'sms', 'pending_review', now() + interval '6 hours', null,
     'Hey John, just checking in on your estimate. Any questions I can help with?', false);

  -- SMS messages (conversation thread)
  INSERT INTO messages (customer_id, estimate_id, direction, channel, body) VALUES
    (v_customer_id, v_estimate_id, 'outbound', 'sms', 'Hi John, this is Wylee from Genesis HVAC. I just sent over your estimate — let me know if you have any questions!'),
    (v_customer_id, v_estimate_id, 'inbound', 'sms', 'Thanks Wylee! I''m reviewing it now. Quick question - does option 1 include the labor?'),
    (v_customer_id, v_estimate_id, 'outbound', 'sms', 'Yes it does! That price covers parts and labor. Happy to walk through it in more detail if you''d like.');

  RAISE NOTICE 'Test data created. Estimate ID: %', v_estimate_id;
END $$;
