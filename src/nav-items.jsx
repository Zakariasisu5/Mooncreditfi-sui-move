import { Home, TrendingUp, User, Zap, DollarSign, CreditCard } from "lucide-react";
import Index from "./pages/Index.jsx";
import AssetDetails from "./pages/AssetDetails.jsx";
import DeFiInsights from "./pages/DeFiInsights.jsx";
import CreditProfileProduction from "./pages/CreditProfileProduction.jsx";
import DePINFinance from "./pages/DePINFinance.jsx";
import LendProduction from "./pages/LendProduction.jsx";
import BorrowProduction from "./pages/BorrowProduction.jsx";

/**
 * Central place for defining the navigation items. Used for navigation components and routing.
 */
export const navItems = [
  {
    title: "Dashboard",
    to: "/dashboard",
    icon: <Home className="h-4 w-4" />,
    page: Index,
  },
  {
    title: "Lend",
    to: "/lend",
    icon: <DollarSign className="h-4 w-4" />,
    page: LendProduction,
  },
  {
    title: "Borrow",
    to: "/borrow",
    icon: <CreditCard className="h-4 w-4" />,
    page: BorrowProduction,
  },
  {
    title: "Credit Profile",
    to: "/credit",
    icon: <User className="h-4 w-4" />,
    page: CreditProfileProduction,
  },
  {
    title: "DeFi Insights",
    to: "/defi",
    icon: <TrendingUp className="h-4 w-4" />,
    page: DeFiInsights,
  },
  {
    title: "DePIN Finance",
    to: "/depin",
    icon: <Zap className="h-4 w-4" />,
    page: DePINFinance,
  },
];

export const routes = [
  ...navItems,
  {
    to: "/asset/:id",
    page: AssetDetails,
  },
];
