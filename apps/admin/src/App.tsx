import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/require-auth";
import { RedirectToLogin } from "./components/redirect-to-login";
import { DashboardLayout } from "./layouts/dashboard-layout";
import { VendorsPage } from "./pages/vendors-page";
import { OrdersPage } from "./pages/orders-page";
import { PayoutsPage } from "./pages/payouts-page";
import { ReviewsPage } from "./pages/reviews-page";
import { SettingsPage } from "./pages/settings-page";
import { ReturnsPage } from "./pages/returns-page";
import { CategoriesPage } from "./pages/categories-page";
import { CouriersPage } from "./pages/couriers-page";
import { PromotionsPage } from "./pages/promotions-page";
import { OverviewPage } from "./pages/overview-page";
import { CustomersPage } from "./pages/customers-page";
import { ProductsModerationPage } from "./pages/products-page";
import { NotFoundPage } from "./pages/not-found-page";
import { AuditLogPage } from "./pages/audit-log-page";
import { ContactMessagesPage } from "./pages/contact-messages-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectToLogin />} />
      <Route
        path="/*"
        element={
          <RequireAuth allowedRoles={["admin"]}>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="products" element={<ProductsModerationPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="payouts" element={<PayoutsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="couriers" element={<CouriersPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="returns" element={<ReturnsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="contact-messages" element={<ContactMessagesPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
