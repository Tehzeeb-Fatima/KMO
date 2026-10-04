import { Route, Routes } from "react-router-dom";
import { ModuleRoute, RequireAuth } from "./components/require-auth";
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
import { BannersPage } from "./pages/banners-page";
import { OverviewPage } from "./pages/overview-page";
import { CustomersPage } from "./pages/customers-page";
import { ProductsModerationPage } from "./pages/products-page";
import { NotFoundPage } from "./pages/not-found-page";
import { AuditLogPage } from "./pages/audit-log-page";
import { ContactMessagesPage } from "./pages/contact-messages-page";
import { UsersPage } from "./pages/users-page";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<RedirectToLogin />} />
      <Route
        path="/*"
        element={
          <RequireAuth allowedRoles={["admin", "staff"]}>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="vendors" element={<ModuleRoute module="vendors"><VendorsPage /></ModuleRoute>} />
        <Route path="orders" element={<ModuleRoute module="orders"><OrdersPage /></ModuleRoute>} />
        <Route path="products" element={<ModuleRoute module="products"><ProductsModerationPage /></ModuleRoute>} />
        <Route path="customers" element={<ModuleRoute module="customers"><CustomersPage /></ModuleRoute>} />
        <Route path="users" element={<ModuleRoute module="users"><UsersPage /></ModuleRoute>} />
        <Route path="payouts" element={<ModuleRoute module="payouts"><PayoutsPage /></ModuleRoute>} />
        <Route path="categories" element={<ModuleRoute module="categories"><CategoriesPage /></ModuleRoute>} />
        <Route path="couriers" element={<ModuleRoute module="couriers"><CouriersPage /></ModuleRoute>} />
        <Route path="promotions" element={<ModuleRoute module="promotions"><PromotionsPage /></ModuleRoute>} />
        <Route path="banners" element={<ModuleRoute module="banners"><BannersPage /></ModuleRoute>} />
        <Route path="returns" element={<ModuleRoute module="returns"><ReturnsPage /></ModuleRoute>} />
        <Route path="reviews" element={<ModuleRoute module="reviews"><ReviewsPage /></ModuleRoute>} />
        <Route path="contact-messages" element={<ModuleRoute module="contact"><ContactMessagesPage /></ModuleRoute>} />
        <Route path="audit-log" element={<ModuleRoute module="audit-log"><AuditLogPage /></ModuleRoute>} />
        <Route path="settings" element={<ModuleRoute module="settings"><SettingsPage /></ModuleRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
