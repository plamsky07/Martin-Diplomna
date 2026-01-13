import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

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
    trackEvent("page_view", {
      path: loc.pathname,
      // можеш да добавиш още: referrer, userAgent и т.н.
    });
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
export default function App() {
  const [filters, setFilters] = useState({
    query: "",
    category: "all",
    subcategory: "all",
    minPrice: "",
    maxPrice: "",
  });
  // categories will hold the FULL category objects from Firestore
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const onSearchChange = (next) => {
    setFilters(next);

    if (next.category === "all") setSubcategories([]);
    else {
      const catObj = categories.find((c) => c.name === next.category);
      setSubcategories(catObj?.subcategories || []);
    }
  };

  const categoryNames = useMemo(() => ["all", ...categories.map((c) => c.name)], [categories]);

  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <BrowserRouter>
            <Tracker />

            <Navbar
              categories={categoryNames}
              subcategories={subcategories}
              filters={filters}
              onSearchChange={onSearchChange}
            />
            
            <AnalyticsWatcher />
            <main className="appMain">
              <Routes>
                <Route
                  path="/"
                  element={<Products filters={filters} onCategories={(cats) => setCategories(cats)} onSubcategories={(subs) => setSubcategories(subs)} />}
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
            </main>
            <Footer />
          </BrowserRouter>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
