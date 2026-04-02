import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, Wallet, CreditCard, TrendingDown, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatsCard from '@/components/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWalletContext } from '@/contexts/WalletContext';
import { useLendingData, useMaxBorrowLimit, useUserDeposits, useDePINProjects, useInvalidateQueries } from '@/hooks/useContractData';
import { DEPIN_PROJECTS } from '@/config/sui';
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
  const { data: userDeposits, isLoading: isLoadingDeposits } = useUserDeposits();
  const { data: depinProjects, isLoading: isLoadingDePIN } = useDePINProjects(DEPIN_PROJECTS);
  const { invalidateAll } = useInvalidateQueries();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real on-chain data
  const depositedBalance = userDeposits?.netDeposited || 0;
  const yieldEarned = userDeposits?.yieldEarned || 0;
  const activeLoanAmount = profile?.debt || 0;
  const totalDeposited = pool?.totalDeposited || 0;
  const currentAPY = pool?.interestRate || 5.0;
  const utilizationRate = pool?.utilizationRate || 0;
  
  // Calculate combined TVL (Lending + DePIN)
  const depinTVL = depinProjects?.reduce((sum, project) => sum + project.currentAmount, 0) || 0;
  const totalTVL = totalDeposited + depinTVL;

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await invalidateAll();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Dashboard Overview</h2>
            <Badge variant="outline" className="text-xs">
              Real-time
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {isLoadingDeposits ? (
            <Card className="card-glow">
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ) : (
            <StatsCard
              title="Deposited Balance"
              value={isConnected ? `${parseFloat(depositedBalance).toFixed(4)} SUI` : 'Not Connected'}
              description={isConnected && userDeposits?.depositCount > 0 ? `${userDeposits.depositCount} deposit${userDeposits.depositCount > 1 ? 's' : ''}` : 'Your lending position'}
              icon={Wallet}
              className="card-glow"
            />
          )}
          {isLoading ? (
            <Card className="card-glow">
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ) : (
            <StatsCard
              title="Active Loan"
              value={isConnected ? `${parseFloat(activeLoanAmount).toFixed(4)} SUI` : 'Not Connected'}
              description={isConnected && profile ? `Max: ${maxBorrowLimit} SUI` : 'Current borrowed amount'}
              icon={TrendingDown}
              className="card-glow"
            />
          )}
          {isLoading ? (
            <Card className="card-glow">
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ) : (
            <StatsCard
              title="Credit Score"
              value={isConnected ? creditScore : 'Not Connected'}
              description={isConnected && profile ? `${profile.loanCount} loan${profile.loanCount !== 1 ? 's' : ''}` : 'Your on-chain credit rating'}
              icon={CreditCard}
              className="card-glow"
            />
          )}
          {isLoadingDeposits ? (
            <Card className="card-glow">
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ) : (
            <StatsCard
              title="Yield Earned"
              value={isConnected ? `${parseFloat(yieldEarned).toFixed(6)} SUI` : 'Not Connected'}
              description={isConnected && yieldEarned > 0 ? `${currentAPY.toFixed(1)}% APY` : 'Total earnings from lending'}
              icon={TrendingUp}
              trend={parseFloat(yieldEarned) > 0 ? currentAPY : 0}
              className="card-glow"
            />
          )}
        </div>
      </motion.div>

      {/* Protocol Stats */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">Protocol Stats</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {isLoading || isLoadingDePIN ? (
            <Card className="card-glow">
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ) : (
            <StatsCard
              title="TVL"
              value={`${parseFloat(totalTVL).toFixed(2)} SUI`}
              description={`Lending: ${totalDeposited.toFixed(2)} + DePIN: ${depinTVL.toFixed(2)}`}
              icon={DollarSign}
              trend={12.5}
            />
          )}
          {isLoading ? (
            <Card className="card-glow">
              <CardContent className="p-3 sm:p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ) : (
            <StatsCard
              title="Current APY"
              value={`${currentAPY.toFixed(1)}%`}
              description={`Utilization: ${utilizationRate.toFixed(1)}%`}
              icon={TrendingUp}
            />
          )}
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
