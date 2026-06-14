import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Alerts from "./pages/Alerts";
import Agent from "./pages/Agent";
import NotFound from "./pages/NotFound";
import SLAMonitor from "./pages/SLAMonitor";
import Interventions from "./pages/Interventions";
import AddSupplier from "./pages/AddSupplier";
import SupplierPortal from "./pages/SupplierPortal";
import DigitalTwin from "./pages/DigitalTwin";
import SupplierSwap from "./pages/SupplierSwap";
import Profile from "./pages/Profile";
import AgentArena from "./pages/AgentArena";
import DriverPortal from "./pages/DriverPortal";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user) {
    const role = user.role?.toLowerCase();
    
    // Internal/management roles that are equivalent to admin for page access
    const adminEquivalentRoles = ['admin', 'procurement', 'supply_chain', 'operations', 'analyst', 'executive', 'other', 'user'];
    
    const isAllowed = allowedRoles.includes(role) || 
                      (allowedRoles.includes('admin') && adminEquivalentRoles.includes(role));

    if (!isAllowed) {
      if (role === 'driver') {
        return <Navigate to="/driver" replace />;
      } else if (role === 'supplier') {
        return <Navigate to="/supplier-portal" replace />;
      } else {
        return <Navigate to="/profile" replace />;
      }
    }
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Index /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin']}><Suppliers /></ProtectedRoute>} />
            <Route path="/suppliers/:id" element={<ProtectedRoute allowedRoles={['admin']}><SupplierDetail /></ProtectedRoute>} />
            <Route path="/add-supplier" element={<ProtectedRoute allowedRoles={['admin']}><AddSupplier /></ProtectedRoute>} />
            <Route path="/alerts" element={<ProtectedRoute allowedRoles={['admin']}><Alerts /></ProtectedRoute>} />
            <Route path="/agent" element={<ProtectedRoute allowedRoles={['admin']}><Agent /></ProtectedRoute>} />
            <Route path="/sla-monitor" element={<ProtectedRoute allowedRoles={['admin']}><SLAMonitor /></ProtectedRoute>} />
            <Route path="/interventions" element={<ProtectedRoute allowedRoles={['admin']}><Interventions /></ProtectedRoute>} />
            <Route path="/supplier-portal" element={<ProtectedRoute allowedRoles={['supplier']}><SupplierPortal /></ProtectedRoute>} />
            <Route path="/driver" element={<ProtectedRoute allowedRoles={['driver']}><DriverPortal /></ProtectedRoute>} />
            <Route path="/digital-twin" element={<ProtectedRoute allowedRoles={['admin']}><DigitalTwin /></ProtectedRoute>} />
            <Route path="/supplier-swap" element={<ProtectedRoute allowedRoles={['admin']}><SupplierSwap /></ProtectedRoute>} />
            <Route path="/agent-arena" element={<ProtectedRoute allowedRoles={['admin']}><AgentArena /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
