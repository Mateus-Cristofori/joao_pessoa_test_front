import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "../login/Login";
import Dashboard from "../dashboard/Dashboard";
import Tickets from "../tickets/Tickets";
import { AuthProvider, PrivateRoute, PublicOnlyRoute } from "../api/api";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tickets" element={<Tickets />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
