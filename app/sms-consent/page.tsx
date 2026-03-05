import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SMS Consent — Genesis Heating, Cooling & Refrigeration",
  description:
    "Learn how Genesis Heating, Cooling & Refrigeration collects SMS consent and how to opt out.",
};

export default function SmsConsentPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          SMS Messaging Consent &amp; Opt-In Disclosure
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Genesis Heating, Cooling &amp; Refrigeration — Last updated March 4,
          2026
        </p>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              How We Collect SMS Consent
            </h2>
            <p>
              Genesis Heating, Cooling &amp; Refrigeration collects consent to
              send SMS text messages during our customer intake process. When a
              customer calls us at{" "}
              <a
                href="tel:+14252619095"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                (425) 261-9095
              </a>{" "}
              to request an HVAC estimate or service, our customer service
              representative reads the following verbal consent script:
            </p>
            <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Verbal Consent Script
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300 italic">
                &quot;We&apos;d like to send you text message updates about your
                estimate and any follow-up regarding your HVAC service. Message
                frequency varies, typically 2 to 8 messages per estimate.
                Message and data rates may apply. You can reply STOP at any time
                to opt out. Is that okay?&quot;
              </p>
            </div>
            <p className="mt-3">
              The customer must verbally confirm consent before any SMS messages
              are sent. Consent to receive SMS messages is{" "}
              <strong>not required</strong> as a condition of purchasing any
              goods or services from Genesis.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              What Messages You Will Receive
            </h2>
            <p>
              If you consent, you may receive the following types of SMS
              messages from Genesis Heating, Cooling &amp; Refrigeration:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Estimate and proposal notifications</li>
              <li>Appointment scheduling and reminders</li>
              <li>Service follow-up messages</li>
              <li>Responses to your questions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Message Frequency &amp; Rates
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Message frequency varies based on your service interactions,
                typically 2–8 messages per estimate.
              </li>
              <li>Message and data rates may apply.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              How to Opt Out
            </h2>
            <p>
              You can opt out of SMS messages at any time using any of these
              methods:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                Reply <strong>STOP</strong> to any text message from Genesis
              </li>
              <li>
                Call us at{" "}
                <a
                  href="tel:+14252619095"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  (425) 261-9095
                </a>
              </li>
              <li>
                Email{" "}
                <a
                  href="mailto:wylee@genesisservices.com"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  wylee@genesisservices.com
                </a>
              </li>
            </ul>
            <p className="mt-2">
              Once you opt out, you will receive a confirmation message and no
              further SMS messages will be sent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              How to Get Help
            </h2>
            <p>
              Reply <strong>HELP</strong> to any text message from Genesis, or
              contact us directly:
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

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Your Privacy
            </h2>
            <p>
              Your mobile phone number and personal information will{" "}
              <strong>not</strong> be shared with or sold to third parties for
              marketing or promotional purposes. For full details, see our{" "}
              <a
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Privacy Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Supported Carriers
            </h2>
            <p>
              SMS messages are supported on all major US carriers including
              AT&amp;T, Verizon, T-Mobile, Sprint, and others. Carrier message
              and data rates may apply.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Additional Information
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <a
                  href="/privacy"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-blue-600 dark:text-blue-400 underline"
                >
                  Terms &amp; Conditions
                </a>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Genesis Heating, Cooling &amp; Refrigeration — Monroe, WA
          </p>
        </div>
      </div>
    </div>
  );
}
