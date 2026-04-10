export default function TermsModal({
  open,
  onClose,
  onAccept,
  selectedState,
  detectedLocation,
  locationMatched,
  syncing,
  syncError,
  onRunSync,
  syncReady,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <div className="font-display text-xl font-bold text-kavach-dark">Terms and Conditions</div>
            <div className="mt-1 text-sm text-gray-500">
              Review once before account creation.
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-stone-200 px-3 py-1 text-sm text-gray-600 hover:bg-stone-50">
            Close
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5 text-sm leading-7 text-gray-700">
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <div className="font-semibold text-kavach-dark">KAVACH FOR WORK: TERMS AND CONDITIONS</div>
            <div className="mt-1 text-xs text-gray-600">
              Governing Law: Information Technology Act (2000), DPDP Act (2023), and Code on Social Security (2020).
            </div>
          </div>

          <section>
            <div className="font-semibold text-kavach-dark">1. Acceptance of Terms</div>
            <p>
              By registering for Kavach for Work, the subscriber enters into a legally binding agreement with Team .exe.
              If the subscriber does not agree, they must stop using the application and the Sentry-AI bridge.
            </p>
          </section>

          <section>
            <div className="font-semibold text-kavach-dark">2. Parametric Service Model</div>
            <p>
              This is a parametric protection plan, not traditional indemnity insurance. Payouts are triggered only by
              objective weather and system data. The Climate Oracle decision for an unworkable event is final for that cycle.
            </p>
          </section>

          <section>
            <div className="font-semibold text-kavach-dark">3. Hardware Verification and Sentry-AI</div>
            <p>
              To prevent fraud, the app may access GPS, geo-fencing, accelerometer, and battery temperature signals. A fraud
              score above 50 out of 100 due to mock location, rooted-device indicators, or failed sensor validation can block payout.
            </p>
          </section>

          <section>
            <div className="font-semibold text-kavach-dark">4. Dynamic Pricing and Payments</div>
            <p>
              Weekly premium and maximum payout depend on the registered State or UT. Approved payouts may be sent to the wallet,
              UPI, or a linked bank account.
            </p>
          </section>

          <section>
            <div className="font-semibold text-kavach-dark">5. Privacy and Data Protection</div>
            <p>
              Team .exe acts as the Data Fiduciary. By accepting, the subscriber gives explicit consent for processing hardware
              and location data. Withdrawal of consent ends coverage immediately and forfeits the current week premium.
            </p>
          </section>

          <section>
            <div className="font-semibold text-kavach-dark">6. Prohibited Activities</div>
            <p>
              Mock location apps, Android emulators, auto-clickers, and multi-accounting are prohibited and may lead to action
              under Section 66D of the IT Act.
            </p>
          </section>

          <section>
            <div className="font-semibold text-kavach-dark">7. Limitation of Liability</div>
            <p>
              The provider is not liable for incorrect third-party weather data, hardware sensor failures, or network issues
              that prevent Sentry-AI sync.
            </p>
          </section>

          <section>
            <div className="font-semibold text-kavach-dark">8. Grievance Redressal</div>
            <p>
              Contact: grievance.kavach@aec.edu. Acknowledgment within 48 hours and resolution within 21 business days.
            </p>
          </section>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <div className="font-semibold text-kavach-dark">Live verification</div>
            <div className="mt-1 text-xs text-gray-600">
              Selected state: {selectedState || 'Not selected'}
            </div>
            <div className="text-xs text-gray-600">
              Detected location: {detectedLocation?.formatted || 'Waiting for live location'}
            </div>
            <div className={`mt-2 text-sm ${locationMatched ? 'text-green-700' : 'text-amber-700'}`}>
              {locationMatched
                ? 'Live location matches the selected state.'
                : syncReady
                  ? 'Live location synced. You can continue with account creation.'
                  : 'Live location sync is recommended, but you can continue without it.'}
            </div>
          </div>

          {syncError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {syncError}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-100 px-6 py-4 sm:flex-row sm:justify-end">
          <div className="text-xs text-gray-500 sm:mr-auto sm:self-center">
            Claims still require live location and sensor verification.
          </div>
          <button
            type="button"
            onClick={onRunSync}
            disabled={syncing}
            className="btn-secondary"
          >
            {syncing ? 'Verifying...' : 'Verify live location'}
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={syncing}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncReady ? 'Accept and create account' : 'Accept and continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
