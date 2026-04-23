import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

import Products from "./pages/Products";
import Favorites from "./pages/Favorites";
import Cart from "./pages/Cart";
import Account from "./pages/Account";

import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Footer from "./components/Footer";
import { trackEvent } from "./utils/analytics";
import AdminUsers from "./pages/admin/AdminUsers";
import Orders from "./pages/Orders";

function Tracker() {
  const loc = useLocation();

  useEffect(() => {
    trackEvent("page_view", { path: loc.pathname });
  }, [loc.pathname]);

  return null;
}

function AnalyticsWatcher() {
  const loc = useLocation();

  useEffect(() => {
    trackEvent("page_view", { path: loc.pathname });
  }, [loc.pathname]);

  return null;
}

function RouteTransitionOverlay({ show }) {
  return (
    <div className={`routeTransitionOverlay${show ? " show" : ""}`} aria-hidden={!show}>
      <div className="routeTransitionLogo" role="status" aria-live="polite">
        <span className="routeTransitionMark">Е</span>
        <span className="routeTransitionText">ЕзиГруп</span>
      </div>
    </div>
  );
}

function AppShell({
  filters,
  setFilters,
  categories,
  setCategories,
  subcategories,
  setSubcategories,
}) {
  const location = useLocation();
  const firstRender = useRef(true);
  const [showRouteLogo, setShowRouteLogo] = useState(false);

  const onSearchChange = (next) => {
    setFilters(next);

    if (next.category === "all") setSubcategories([]);
    else {
      const catObj = categories.find((c) => c.name === next.category);
      setSubcategories(catObj?.subcategories || []);
    }
  };

  const categoryNames = useMemo(() => ["all", ...categories.map((c) => c.name)], [categories]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const isProductsPage = location.pathname === "/";
    if (!isProductsPage) {
      setShowRouteLogo(false);
      return;
    }

    setShowRouteLogo(true);
    const timer = setTimeout(() => setShowRouteLogo(false), 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      <Tracker />

      <Navbar />

      <AnalyticsWatcher />

      <main className="appMain">
        <div key={`${location.pathname}${location.search}`} className="routePageEnter">
          <Routes location={location}>
            <Route
              path="/"
              element={
                <Products
                  filters={filters}
                  categories={categoryNames}
                  subcategories={subcategories}
                  onSearchChange={onSearchChange}
                  onCategories={(cats) => setCategories(cats)}
                  onSubcategories={(subs) => setSubcategories(subs)}
                />
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <div className="container">
                    <AdminProducts />
                  </div>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <Footer />
      <RouteTransitionOverlay show={showRouteLogo} />
    </>
  );
}

export default function App() {
  const [filters, setFilters] = useState({
    query: "",
    category: "all",
    subcategory: "all",
    minPrice: "",
    maxPrice: "",
  });
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <AppShell
              filters={filters}
              setFilters={setFilters}
              categories={categories}
              setCategories={setCategories}
              subcategories={subcategories}
              setSubcategories={setSubcategories}
            />
          </BrowserRouter>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
