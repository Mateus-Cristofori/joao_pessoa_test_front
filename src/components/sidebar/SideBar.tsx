import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { Icons } from "./Icons";
import { useAuth } from "../../api/api";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Icons.grid() },
  { to: "/tickets", label: "Solicitações", icon: Icons.clipboard() },
];

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">{Icons.file(20)}</div>
        <div>
          <strong className="brand-title">Solicitações</strong>
          <span className="brand-subtitle">Painel de controle</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" className="logout-btn" onClick={onLogout}>
          {Icons.logout()}
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
