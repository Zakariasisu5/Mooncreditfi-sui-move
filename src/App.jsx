import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HashRouter, Routes, Route } from "react-router-dom";
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider as SuiWalletProvider } from '@mysten/dapp-kit';
import '@mysten/dapp-kit/dist/index.css';
import { networkConfig, ACTIVE_NETWORK } from './config/sui';
import { WalletProvider } from "./contexts/WalletContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { routes } from "./nav-items";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import Whitepaper from "./pages/Whitepaper";
import ProductDemo from "./pages/ProductDemo";
import DePINFundingComponent from "./components/DePINFundingComponent";

const queryClient = new QueryClient();

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={ACTIVE_NETWORK}>
        <SuiWalletProvider autoConnect>
          <NotificationProvider>
            <WalletProvider>
              <TooltipProvider>
              <Toaster />
              <HashRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/whitepaper" element={<Whitepaper />} />
                  <Route path="/demo" element={<ProductDemo />} />
                  <Route
                    path="/*"
                    element={
                      <div className="min-h-screen bg-background">
                        {sidebarOpen && (
                          <div
                            className="fixed inset-0 bg-black/40 z-40 md:hidden"
                            onClick={() => setSidebarOpen(false)}
                            aria-hidden="true"
                          />
                        )}

                        <Navbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />
                        <div className="flex">
                          <Sidebar sidebarOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                          <main className="flex-1 p-4 md:p-8">
                            <Routes>
                              {routes.map(({ to, page: Page }) => (
                                <Route key={to} path={to} element={<Page />} />
                              ))}
                              <Route path="depin" element={<DePINFundingComponent />} />
                            </Routes>
                          </main>
                        </div>
                      </div>
                    }
                  />
                </Routes>
              </HashRouter>
              </TooltipProvider>
            </WalletProvider>
          </NotificationProvider>
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};

export default App;
