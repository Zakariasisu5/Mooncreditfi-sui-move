import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, Wallet, CreditCard, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatsCard from '@/components/StatsCard';
import { useWalletContext } from '@/contexts/WalletContext';
import { useLendingData, useMaxBorrowLimit } from '@/hooks/useContractData';
import { motion } from 'framer-motion';

// Fallback price history for SUI trends
const fallbackPriceHistory = [
  { date: '01-28', price: 0.45 },
  { date: '01-29', price: 0.48 },
  { date: '01-30', price: 0.52 },
  { date: '01-31', price: 0.49 },
  { date: '02-01', price: 0.55 },
  { date: '02-02', price: 0.58 },
  { date: '02-03', price: 0.62 }
];

const Index = () => {
  const { isConnected, account } = useWalletContext();
  const { pool, profile, balance, isLoading } = useLendingData();
  const { creditScore, maxBorrowLimit } = useMaxBorrowLimit();

  // Real on-chain data
  const depositedBalance = profile?.totalBorrowed || 0;
  const yieldEarned = 0; // TODO: Calculate from pool data
  const activeLoanAmount = profile?.totalBorrowed || 0;
  const totalDeposited = pool?.totalDeposited || 0;
  const currentAPY = pool?.interestRate / 100 || 5.0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 sm:space-y-6 md:space-y-8 px-1 sm:px-0"
    >
      {/* Dashboard Overview Cards */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Dashboard Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatsCard
            title="Deposited Balance"
            value={isConnected ? `${parseFloat(depositedBalance).toFixed(2)} SUI` : 'Not Connected'}
            description="Your lending position"
            icon={Wallet}
            className="card-glow"
          />
          <StatsCard
            title="Active Loan"
            value={`${parseFloat(activeLoanAmount).toFixed(2)} SUI`}
            description="Current borrowed amount"
            icon={TrendingDown}
            className="card-glow"
          />
          <StatsCard
            title="Credit Score"
            value={creditScore}
            description="Your on-chain credit rating"
            icon={CreditCard}
            className="card-glow"
          />
          <StatsCard
            title="Yield Earned"
            value={`${parseFloat(yieldEarned).toFixed(4)} SUI`}
            description="Total earnings from lending"
            icon={TrendingUp}
            trend={parseFloat(yieldEarned) > 0 ? 8.5 : 0}
            className="card-glow"
          />
        </div>
      </motion.div>

      {/* Protocol Stats */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Protocol Stats</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatsCard
            title="TVL"
            value={`${parseFloat(totalDeposited).toFixed(2)} SUI`}
            description="Total Value Locked"
            icon={DollarSign}
            trend={12.5}
          />
          <StatsCard
            title="Current APY"
            value={`${currentAPY.toFixed(1)}%`}
            description="Lending yield rate"
            icon={TrendingUp}
          />
          <StatsCard
            title="Active Users"
            value="Live"
            description="Protocol is operational"
            icon={Users}
          />
          <StatsCard
            title="Network"
            value="Sui"
            description="Testnet"
            icon={CreditCard}
          />
        </div>
      </motion.div>

      {/* Quick Actions & Price Chart */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="card-glow">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0 space-y-3">
            <Link
              to="/lend"
              className="block p-4 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors border border-primary/20"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Deposit & Earn</p>
                  <p className="text-sm text-muted-foreground">Earn {currentAPY.toFixed(1)}% APY on your SUI</p>
                </div>
              </div>
            </Link>
            <Link
              to="/borrow"
              className="block p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Borrow SUI</p>
                  <p className="text-sm text-muted-foreground">Use your credit score to borrow</p>
                </div>
              </div>
            </Link>
            <Link
              to="/depin"
              className="block p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Fund DePIN Projects</p>
                  <p className="text-sm text-muted-foreground">Earn yield from infrastructure</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-glow">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg">SUI Price (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4 md:p-6 pt-0">
            <ResponsiveContainer width="100%" height={200} className="sm:!h-[220px]">
              <LineChart data={fallbackPriceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} width={40} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [`$${value.toFixed(4)}`, 'Price']}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Index;
