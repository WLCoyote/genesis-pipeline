-- Update default sequence templates to include {{estimate_link}}
-- Run in Supabase SQL Editor AFTER 006_estimate_url.sql
--
-- Email templates use HTML hyperlinks: <a href="...">View your estimate</a>
-- SMS templates show the URL on its own line (SMS can't render hyperlinks)

UPDATE follow_up_sequences
SET steps = '[
  {
    "day_offset": 0,
    "channel": "sms",
    "is_call_task": false,
    "template": "Hi {{customer_name}}, this is {{comfort_pro_name}} from Genesis. I just sent your estimate to {{customer_email}} — you can view and approve it here:\n{{estimate_link}}"
  },
  {
    "day_offset": 1,
    "channel": "sms",
    "is_call_task": false,
    "template": "Hi {{customer_name}}, just checking in — did you get a chance to look over the estimate? You can review it anytime:\n{{estimate_link}}"
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
    "template": "Hi {{customer_name}},<br><br>Just following up on the estimate we sent over. You can review and approve it anytime:<br><br><a href=\"{{estimate_link}}\" style=\"display:inline-block;padding:10px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;\">View Your Estimate</a><br><br>We also offer financing options to help make this more manageable, and there may be manufacturer rebates available right now.<br><br>Let us know if you have any questions or want to move forward!<br><br>Best,<br>{{comfort_pro_name}}<br>Genesis Heating, Cooling & Refrigeration"
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
    "template": "Hi {{customer_name}},<br><br>We would love to earn your business. If you have any concerns about the estimate or want to explore different options, we are happy to work with you.<br><br><a href=\"{{estimate_link}}\" style=\"display:inline-block;padding:10px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;\">View Your Estimate</a><br><br>Feel free to reach out anytime — we are here to help.<br><br>Best,<br>{{comfort_pro_name}}<br>Genesis Heating, Cooling & Refrigeration"
  },
  {
    "day_offset": 30,
    "channel": "sms",
    "is_call_task": false,
    "template": "Hi {{customer_name}}, just one more check-in from Genesis. If you are still considering the estimate, you can review it here:\n{{estimate_link}}\nWe are here whenever you are ready."
  },
  {
    "day_offset": 60,
    "channel": "email",
    "is_call_task": false,
    "template": "Hi {{customer_name}},<br><br>We wanted to reach out one last time regarding your estimate. If your plans have changed or you have gone in a different direction, no worries at all.<br><br>If you would like to take another look:<br><br><a href=\"{{estimate_link}}\" style=\"display:inline-block;padding:10px 24px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;\">View Your Estimate</a><br><br>If you would like to revisit this down the road, do not hesitate to call us.<br><br>Best,<br>{{comfort_pro_name}}<br>Genesis Heating, Cooling & Refrigeration"
  }
]'::jsonb
WHERE name = 'Standard Estimate Follow-Up';
