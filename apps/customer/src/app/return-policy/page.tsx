import { permanentRedirect } from "next/navigation";

// KMO has no return policy any more; the exchange policy replaced it.
export default function ReturnPolicyPage() {
  permanentRedirect("/exchange-policy");
}
