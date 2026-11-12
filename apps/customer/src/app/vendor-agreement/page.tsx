import { VendorAgreementContent } from "./vendor-agreement-content";

export const metadata = {
  title: "Vendor Agreement — Karachi Mart Online",
  description: "The agreement every seller accepts to sell on Karachi Mart Online: listings, orders, delivery, fees and payouts.",
  alternates: { canonical: "/vendor-agreement" },
};

export default function VendorAgreementPage() {
  return <VendorAgreementContent />;
}
