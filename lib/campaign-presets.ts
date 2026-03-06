// 5 preset email templates for campaign system
import { EmailBlock } from "./campaign-types";

interface PresetTemplate {
  name: string;
  description: string;
  blocks: EmailBlock[];
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: "Seasonal Tune-Up Reminder",
    description: "Remind customers to schedule seasonal HVAC maintenance",
    blocks: [
      { id: "p1h", type: "header", content: { title: "Time for Your Seasonal Tune-Up!", showLogo: true } },
      { id: "p1t", type: "text", content: { html: "<p>Hi {{customer_name}},</p><p>It's that time of year again! Regular maintenance keeps your HVAC system running efficiently and extends its lifespan. Our certified technicians are ready to make sure your home stays comfortable all season long.</p>" } },
      { id: "p1b", type: "button", content: { text: "Schedule Your Tune-Up", url: "https://genesishvacr.com/contact", color: "#1565c0" } },
      { id: "p1d", type: "divider", content: { color: "#e0e0e0" } },
      { id: "p1t2", type: "text", content: { html: "<p><strong>What's included:</strong></p><ul><li>Full system inspection</li><li>Filter replacement</li><li>Coil cleaning</li><li>Performance testing</li><li>Safety check</li></ul>" } },
      { id: "p1s", type: "spacer", content: { height: 16 } },
      { id: "p1t3", type: "text", content: { html: "<p style=\"color: #666;\">Questions? Call us at <strong>(360) 794-8300</strong> — we're happy to help!</p>" } },
    ],
  },
  {
    name: "New Equipment Promotion",
    description: "Promote new equipment installations with special pricing",
    blocks: [
      { id: "p2h", type: "header", content: { title: "Upgrade Your Comfort — Special Offer Inside", showLogo: true } },
      { id: "p2t", type: "text", content: { html: "<p>Hi {{customer_name}},</p><p>Thinking about upgrading your HVAC system? Now is the perfect time. We're offering exclusive pricing on high-efficiency heat pumps and furnaces — with rebates that can save you thousands.</p>" } },
      { id: "p2i", type: "image", content: { url: "https://app.genesishvacr.com/genesis-logo.png", alt: "Genesis HVAC Equipment", width: 400 } },
      { id: "p2c", type: "two-column", content: { left: { html: "<p><strong>Heat Pumps</strong></p><p>Up to 40% energy savings with the latest inverter technology.</p>" }, right: { html: "<p><strong>Furnaces</strong></p><p>96%+ AFUE efficiency keeps you warm for less.</p>" } } },
      { id: "p2b", type: "button", content: { text: "Get a Free Estimate", url: "https://genesishvacr.com/contact", color: "#1565c0" } },
      { id: "p2t2", type: "text", content: { html: "<p style=\"color: #666; font-size: 14px;\">Financing available. Ask about our 0% APR options.</p>" } },
    ],
  },
  {
    name: "Maintenance Plan Offer",
    description: "Promote maintenance plan memberships to existing customers",
    blocks: [
      { id: "p3h", type: "header", content: { title: "Join Our Maintenance Plan — Save All Year", showLogo: true } },
      { id: "p3t", type: "text", content: { html: "<p>Hi {{customer_name}},</p><p>Protect your HVAC investment with our annual maintenance plan. Members enjoy priority scheduling, exclusive discounts, and peace of mind knowing their system is always in top shape.</p>" } },
      { id: "p3d", type: "divider", content: { color: "#e0e0e0" } },
      { id: "p3c", type: "two-column", content: { left: { html: "<p><strong>Plan Benefits:</strong></p><ul><li>2 tune-ups per year</li><li>Priority scheduling</li><li>15% off repairs</li><li>No overtime charges</li></ul>" }, right: { html: "<p><strong>Starting at</strong></p><p style=\"font-size: 32px; font-weight: bold; color: #1565c0;\">$14.99<span style=\"font-size: 14px; color: #666;\">/mo</span></p><p style=\"color: #666;\">No contracts. Cancel anytime.</p>" } } },
      { id: "p3b", type: "button", content: { text: "Learn More About Plans", url: "https://genesishvacr.com/contact", color: "#1565c0" } },
    ],
  },
  {
    name: "Holiday Thank You",
    description: "Thank customers during the holiday season with a personal touch",
    blocks: [
      { id: "p4h", type: "header", content: { title: "Happy Holidays from Genesis HVAC!", showLogo: true } },
      { id: "p4t", type: "text", content: { html: "<p>Hi {{customer_name}},</p><p>As the year comes to a close, we want to take a moment to thank you for trusting Genesis with your home comfort. It's customers like you that make what we do meaningful.</p><p>From our family to yours, we wish you a warm and wonderful holiday season!</p>" } },
      { id: "p4s", type: "spacer", content: { height: 16 } },
      { id: "p4t2", type: "text", content: { html: "<p><strong>Veteran-Owned &middot; Monroe, WA</strong></p><p style=\"color: #666;\">Serving Snohomish County and beyond since 2019.</p>" } },
      { id: "p4t3", type: "text", content: { html: "<p style=\"color: #666; font-size: 14px;\">Need anything before the new year? We're here for you at <strong>(360) 794-8300</strong>.</p>" } },
    ],
  },
  {
    name: "Service Follow-Up",
    description: "Follow up after a service visit to check satisfaction and ask for reviews",
    blocks: [
      { id: "p5h", type: "header", content: { title: "How Did We Do?", showLogo: true } },
      { id: "p5t", type: "text", content: { html: "<p>Hi {{customer_name}},</p><p>Thank you for choosing Genesis for your recent service. We hope everything is working perfectly! Your feedback helps us improve and serve you better.</p>" } },
      { id: "p5b", type: "button", content: { text: "Leave a Review", url: "https://g.page/r/genesis-hvac/review", color: "#1565c0" } },
      { id: "p5d", type: "divider", content: { color: "#e0e0e0" } },
      { id: "p5t2", type: "text", content: { html: "<p>Not satisfied? We want to make it right. Reply to this email or call us at <strong>(360) 794-8300</strong> and we'll take care of it.</p>" } },
      { id: "p5t3", type: "text", content: { html: "<p style=\"color: #666; font-size: 14px;\">Thank you for supporting a veteran-owned local business!</p>" } },
    ],
  },
];
