import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions — Genesis Heating, Cooling & Refrigeration",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Genesis Heating, Cooling &amp; Refrigeration — Last updated February
          18, 2026
        </p>

        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Agreement to Terms
            </h2>
            <p>
              By requesting an estimate, scheduling a service, or communicating
              with Genesis Heating, Cooling &amp; Refrigeration (&quot;Genesis,&quot;
              &quot;we,&quot; &quot;us&quot;), you agree to these Terms &amp;
              Conditions. If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Services
            </h2>
            <p>
              Genesis provides heating, cooling, and refrigeration installation,
              repair, and maintenance services in the Monroe, Washington area.
              All services are subject to availability and scheduling.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Estimates
            </h2>
            <p>
              Estimates provided by Genesis are based on information available at
              the time and are subject to change. An estimate is not a binding
              contract until accepted and signed by both parties. Estimates are
              valid for 30 days unless otherwise stated.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              SMS Communications
            </h2>
            <p>
              By providing your phone number, you consent to receive SMS
              messages from Genesis regarding your estimates, appointments, and
              service follow-ups. You may opt out at any time by replying STOP
              to any message. Message and data rates may apply. Message
              frequency varies based on your service interactions.
            </p>
            <p className="mt-2">
              We will not use your phone number for unrelated marketing without
              your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Payment
            </h2>
            <p>
              Payment terms are outlined in your signed estimate or service
              agreement. Genesis reserves the right to charge for services
              rendered. Any disputes regarding charges must be raised within 30
              days of the invoice date.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Limitation of Liability
            </h2>
            <p>
              Genesis is not liable for indirect, incidental, or consequential
              damages arising from the use of our services or communications.
              Our total liability shall not exceed the amount paid for the
              specific service in question.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Warranty
            </h2>
            <p>
              Warranty terms for equipment and labor are specified in your
              service agreement. Manufacturer warranties are separate and
              governed by the manufacturer&apos;s terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Privacy
            </h2>
            <p>
              Your use of our services is also governed by our{" "}
              <a
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Privacy Policy
              </a>
              , which describes how we collect, use, and protect your personal
              information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Changes to Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of our
              services after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Contact Us
            </h2>
            <p>
              If you have questions about these terms, contact us:
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
            Genesis Heating, Cooling &amp; Refrigeration — Monroe, WA
          </p>
        </div>
      </div>
    </div>
  );
}
