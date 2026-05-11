import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { lazy, Suspense, useEffect } from "react";
import Header from "@/components/layout/Header";
import MessengerButton from "@/components/layout/MessengerButton";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import { initMetaPixel } from "@/lib/metaPixel";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const Catalog = lazy(() => import("./pages/Catalog"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const ResetPassword = lazy(() => import("./pages/admin/ResetPassword"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminPacks = lazy(() => import("./pages/admin/AdminPacks"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients")); // kept for route but removed from nav
const AdminPromos = lazy(() => import("./pages/admin/AdminPromos"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminDelivery = lazy(() => import("./pages/admin/AdminDelivery"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Chargement">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" aria-hidden="true" />
      <span className="sr-only">Chargement en cours...</span>
    </div>
  );
}

function PixelInit() {
  useEffect(() => { initMetaPixel(); }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <CartProvider>
            <ErrorBoundary>
              <PixelInit />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Landing pages for Facebook/Instagram ads */}
                  <Route path="/l/:slug" element={<LandingPage />} />

                  {/* Admin routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/reset-password" element={<ResetPassword />} />
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="packs" element={<AdminPacks />} />
                    <Route path="clients" element={<AdminClients />} />
                    <Route path="promos" element={<AdminPromos />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="delivery" element={<AdminDelivery />} />
                  </Route>

                  {/* Client routes */}
                  <Route
                    path="*"
                    element={
                      <>
                        <Header />
                        <CartDrawer />
                        <main id="main-content">
                          <Routes>
                            <Route path="/" element={<Index />} />
                            <Route path="/catalogue" element={<Catalog />} />
                            <Route path="/produit/:id" element={<ProductDetail />} />
                            <Route path="/checkout" element={<Checkout />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                        <Footer />
                        <MessengerButton />
                      </>
                    }
                  />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </CartProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
