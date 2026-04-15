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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 px-4 py-4">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div>
            <div className="font-display text-lg font-bold text-kavach-dark">Terms & Conditions</div>
            <div className="text-[11px] text-gray-500">
              Please review before proceeding.
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-stone-200 px-3 py-1 text-xs text-gray-600 hover:bg-stone-50">
            Close
          </button>
        </div>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-4 text-[13px] leading-6 text-gray-700">
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

          <div className="rounded-xl border border-sky-100 bg-sky-50 p-3">
            <div className="font-semibold text-kavach-dark">Live verification</div>
            <div className="mt-1 text-[11px] text-gray-600">
              State: {selectedState || 'Not selected'}
            </div>
            <div className="text-[11px] text-gray-600">
              Location: {detectedLocation?.formatted || 'Waiting...'}
            </div>
            <div className={`mt-1.5 text-xs ${locationMatched ? 'text-green-700 font-bold' : 'text-amber-700'}`}>
              {locationMatched
                ? '✓ Location matches state.'
                : syncReady
                  ? '✓ Sync complete. You can continue.'
                  : 'Location sync recommended.'}
            </div>
          </div>

          {syncError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {syncError}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-stone-100 px-5 py-3 sm:flex-row sm:justify-end">
          <div className="text-[10px] text-gray-400 sm:mr-auto sm:self-center">
            Subject to live sensor verification.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRunSync}
              disabled={syncing}
              className="flex-1 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-600 sm:flex-none"
            >
              {syncing ? '...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={syncing}
              className="flex-1 rounded-xl bg-kavach-orange px-4 py-2 text-xs font-bold text-white sm:flex-none disabled:opacity-50"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
