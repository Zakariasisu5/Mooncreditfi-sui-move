import { NavLink, useLocation } from 'react-router-dom';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import WalletConnectButton from './WalletConnectButton';
import NotificationButton from './NotificationButton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const Navbar = ({ onToggleSidebar }) => {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  
  // Check if we're on a public route (landing, about, terms, etc.)
  const publicRoutes = ['/', '/about', '/terms', '/privacy', '/contact', '/whitepaper'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success('Wallet disconnected');
  };

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border px-3 py-2 sm:px-4 sm:py-3">
      <div className="container mx-auto flex justify-between items-center gap-2 min-h-[44px]">
        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          {/* hamburger - visible on protected routes only */}
          {!isPublicRoute && (
            <button
              aria-label="Toggle menu"
              className="md:hidden p-2 rounded-md hover:bg-muted transition-colors flex-shrink-0"
              onClick={() => onToggleSidebar && onToggleSidebar()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <NavLink to={account ? "/dashboard" : "/"} className="flex items-center flex-shrink-0" aria-label="MoonCreditFi">
            <img
              src="/logo.png"
              alt="MoonCreditFi logo"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-md object-cover"
              aria-hidden={false}
              onError={(e) => { e.currentTarget.src = '/moonfi-logo.svg'; }}
            />
          </NavLink>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {account && !isPublicRoute && <NotificationButton />}
          
          {account ? (
            // Show wallet info when connected
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 min-h-[44px]">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {account.address.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{formatAddress(account.address)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  <span className="text-xs">{copied ? 'Copied!' : formatAddress(account.address)}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(`https://suiexplorer.com/address/${account.address}?network=testnet`, '_blank')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  View on Explorer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDisconnect} className="cursor-pointer text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // Show connect button when not connected
            <WalletConnectButton />
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
