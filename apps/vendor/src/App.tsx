import { Route, Routes } from "react-router-dom";
import { SignupPage } from "./pages/signup-page";
import { RequireAuth } from "./components/require-auth";
import { RedirectToLogin } from "./components/redirect-to-login";
import { DashboardLayout } from "./layouts/dashboard-layout";
import { StoreSettingsPage } from "./pages/store-settings-page";
import { ProductsPage } from "./pages/products-page";
import { OrdersPage } from "./pages/orders-page";
import { PaymentsPage } from "./pages/payments-page";
import { ReviewsPage } from "./pages/reviews-page";
import { ShippingPage } from "./pages/shipping-page";
import { CouponsPage } from "./pages/coupons-page";
import { OverviewPage } from "./pages/overview-page";
import { ProfilePage } from "./pages/profile-page";
import { SalesReportPage } from "./pages/sales-report-page";
import { NotFoundPage } from "./pages/not-found-page";
import { MessagesPage } from "./pages/messages-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectToLogin />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth allowedRoles={["vendor"]}>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="shipping" element={<ShippingPage />} />
        <Route path="sales-report" element={<SalesReportPage />} />
        <Route path="settings" element={<StoreSettingsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
