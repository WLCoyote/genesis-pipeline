import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Proposal — Genesis Heating, Cooling & Refrigeration",
  description: "Review your personalized comfort system proposal from Genesis HVAC.",
};

export default function ProposalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Lato:wght@300;400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Lato', sans-serif",
          background: "#050d1a",
          color: "#cdd8e8",
          minHeight: "100vh",
          overflowX: "hidden",
        }}
      >
        {children}
      </body>
    </html>
  );
}
