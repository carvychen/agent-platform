import { Link, useLocation } from "react-router-dom";
import { Puzzle, Bot, MessageSquare, Plug, Bell, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

const navItems = [
  { path: "/skills", icon: Puzzle, label: "Skills" },
  { path: "/agents", icon: Bot, label: "Agents" },
  { path: "/prompts", icon: MessageSquare, label: "Prompts" },
  { path: "/mcps", icon: Plug, label: "MCP Servers" },
];

export function Sidebar() {
  const location = useLocation();
  const { isAuthenticated, user, login, logout } = useAuth();

  return (
    <aside className="flex flex-col w-16 hover:w-56 transition-all duration-200 bg-white group overflow-hidden shrink-0 h-screen border-r border-border">
      {/* Logo */}
      <div className="flex items-center h-12 px-4 mt-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Puzzle className="w-4 h-4 text-white" />
        </div>
        <span className="ml-3 text-text-primary font-semibold text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          Agent Platform
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 mt-6 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center h-10 rounded-lg px-3 transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary border-l-[3px] border-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-1">
        <button className="flex items-center h-10 w-full rounded-lg px-3 text-text-secondary hover:text-text-primary hover:bg-surface transition-colors">
          <Bell className="w-5 h-5 shrink-0" />
          <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Notifications
          </span>
        </button>
        {isAuthenticated ? (
          <>
            {/* User info */}
            <div className="flex items-center h-10 w-full rounded-lg px-3 text-text-secondary">
              <div className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0">
                {user?.name?.charAt(0) || "U"}
              </div>
              <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {user?.name || "User"}
              </span>
            </div>
            {/* Sign out */}
            <button
              onClick={logout}
              className="flex items-center h-10 w-full rounded-lg px-3 text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Sign out
              </span>
            </button>
          </>
        ) : (
          <button
            onClick={login}
            className="flex items-center h-10 w-full rounded-lg px-3 text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Sign in
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
