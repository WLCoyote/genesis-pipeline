-- ============================================
-- Genesis HVAC Pipeline — Default Follow-Up Sequence
-- Run this in the Supabase SQL Editor AFTER 001 and 002
-- ============================================

INSERT INTO follow_up_sequences (name, is_default, steps)
VALUES (
  'Standard Estimate Follow-Up',
  true,
  '[
    {
      "day_offset": 0,
      "channel": "sms",
      "is_call_task": false,
      "template": "Hi {{customer_name}}, this is {{comfort_pro_name}} from Genesis. I just sent your estimate to {{customer_email}} — let me know if you have any questions!"
    },
    {
      "day_offset": 1,
      "channel": "sms",
      "is_call_task": false,
      "template": "Hi {{customer_name}}, just checking in — did you get a chance to look over the estimate? Happy to walk through anything."
    },
    {
      "day_offset": 3,
      "channel": "call",
      "is_call_task": true,
      "template": "Call {{customer_name}} to discuss estimate. Review engagement history before calling."
    },
    {
      "day_offset": 7,
      "channel": "email",
      "is_call_task": false,
      "template": "Hi {{customer_name}},\n\nJust following up on the estimate we sent over. Wanted to make sure you saw that we offer financing options to help make this more manageable.\n\nThere may also be manufacturer rebates available right now — happy to walk you through those.\n\nLet us know if you have any questions or want to move forward!\n\nBest,\n{{comfort_pro_name}}\nGenesis Heating, Cooling & Refrigeration"
    },
    {
      "day_offset": 14,
      "channel": "call",
      "is_call_task": true,
      "template": "Second follow-up call with {{customer_name}}. Check email open/click history before calling to tailor the conversation."
    },
    {
      "day_offset": 21,
      "channel": "email",
      "is_call_task": false,
      "template": "Hi {{customer_name}},\n\nWe would love to earn your business. If you have any concerns about the estimate or want to explore different options, we are happy to work with you.\n\nFeel free to reach out anytime — we are here to help.\n\nBest,\n{{comfort_pro_name}}\nGenesis Heating, Cooling & Refrigeration"
    },
    {
      "day_offset": 30,
      "channel": "sms",
      "is_call_task": false,
      "template": "Hi {{customer_name}}, just one more check-in from Genesis. If you are still considering the estimate, we are here whenever you are ready. No pressure at all."
    },
    {
      "day_offset": 60,
      "channel": "email",
      "is_call_task": false,
      "template": "Hi {{customer_name}},\n\nWe wanted to reach out one last time regarding your estimate. If your plans have changed or you have gone in a different direction, no worries at all.\n\nIf you would like to revisit this down the road, do not hesitate to call us. We are always happy to help.\n\nBest,\n{{comfort_pro_name}}\nGenesis Heating, Cooling & Refrigeration"
    }
  ]'::jsonb
);
