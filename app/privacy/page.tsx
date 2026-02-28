import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Genesis Heating, Cooling & Refrigeration",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Genesis Heating, Cooling & Refrigeration — Last updated February 26,
          2026
        </p>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Who We Are
            </h2>
            <p>
              Genesis Heating, Cooling & Refrigeration (&quot;Genesis,&quot;
              &quot;we,&quot; &quot;us&quot;) is an HVAC service company based in
              Monroe, Washington. This policy explains how we collect, use, and
              protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Information We Collect
            </h2>
            <p>When you request an estimate or contact us, we may collect:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Name</li>
              <li>Phone number</li>
              <li>Email address</li>
              <li>Service address</li>
              <li>Details about your HVAC service needs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Prepare and send HVAC estimates</li>
              <li>
                Send SMS and email follow-ups about your estimate status
              </li>
              <li>Schedule and confirm service appointments</li>
              <li>Respond to your questions and requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              SMS Messaging
            </h2>
            <p>
              By providing your mobile phone number and requesting an estimate
              or service, you consent to receive SMS text messages from Genesis
              Heating, Cooling &amp; Refrigeration at the number you provided.
              Messages may include estimate notifications, appointment
              reminders, service follow-ups, and responses to your inquiries.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Message frequency varies based on your service interactions (typically 2–8 messages per estimate).</li>
              <li>Message and data rates may apply. Check with your carrier for details.</li>
              <li>Reply <strong>STOP</strong> to any message to opt out of SMS communications at any time.</li>
              <li>Reply <strong>HELP</strong> for assistance or contact us at (425) 261-9095.</li>
              <li>Consent to receive SMS is not required as a condition of purchasing any goods or services.</li>
            </ul>
            <p className="mt-2">
              You may also opt out by calling{" "}
              <a
                href="tel:+14252619095"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                (425) 261-9095
              </a>{" "}
              or emailing{" "}
              <a
                href="mailto:wylee@genesisservices.com"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                wylee@genesisservices.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Data Sharing
            </h2>
            <p>
              We do not sell, rent, or share your personal information,
              including your mobile phone number, with third parties for
              marketing or promotional purposes. We may share your information
              with trusted service providers solely to deliver our services
              (e.g., SMS delivery via Twilio, email delivery via Resend,
              scheduling via Housecall Pro). These providers are contractually
              bound to use your information only as needed to perform services
              on our behalf and are prohibited from using it for their own
              marketing.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Data Security
            </h2>
            <p>
              We use industry-standard measures to protect your information,
              including encrypted connections and secure data storage. Access to
              customer data is restricted to authorized team members only.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Data Retention
            </h2>
            <p>
              We retain your information for as long as needed to provide
              services and comply with legal obligations. You may request
              deletion of your personal data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Contact Us
            </h2>
            <p>
              If you have questions about this privacy policy or want to update
              or delete your information, contact us:
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                Phone:{" "}
                <a
                  href="tel:+14252619095"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  (425) 261-9095
                </a>
              </li>
              <li>
                Email:{" "}
                <a
                  href="mailto:wylee@genesisservices.com"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  wylee@genesisservices.com
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Genesis Heating, Cooling & Refrigeration — Monroe, WA
          </p>
        </div>
      </div>
    </div>
  );
}
