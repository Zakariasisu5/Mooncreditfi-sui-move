import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useWalletContext } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { DollarSign, CreditCard, TrendingUp, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const Borrow = () => {
  const { account, isConnected } = useWalletContext();
  const { addNotification } = useNotifications();
  const [borrowAmount, setBorrowAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data — replace with real Sui object queries once Move contracts are deployed
  const creditScore = 0;
  const maxBorrowLimit = '0';
  const activeLoan = null;
  const loanHistory = [];

  const handleBorrow = async () => {
    if (!isConnected) { toast.error('Please connect your wallet first'); return; }
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) { toast.error('Please enter a valid amount'); return; }
    if (parseFloat(borrowAmount) > parseFloat(maxBorrowLimit)) {
      toast.error(`Amount exceeds your borrowing limit of ${parseFloat(maxBorrowLimit).toFixed(4)} SUI`);
      return;
    }
    if (creditScore < 500) { toast.error('Your credit score is too low to borrow. Minimum required: 500'); return; }

    setIsLoading(true);
    try {
      // TODO: Build real Sui Transaction when Move contracts are deployed
      toast.info('Move contracts not yet deployed — borrow simulated');
      addNotification(`Borrowed ${borrowAmount} SUI`, 'success');
      setBorrowAmount('');
    } catch (error) {
      console.error('Borrow error:', error);
      toast.error('Failed to borrow: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!isConnected) { toast.error('Please connect your wallet first'); return; }
    if (!activeLoan) { toast.error('No active loan to repay'); return; }

    setIsLoading(true);
    try {
      toast.info('Move contracts not yet deployed — repayment simulated');
      addNotification('Repaid loan — credit score updated', 'success');
    } catch (error) {
      toast.error('Failed to repay: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  const getCreditScoreBadge = () => {
    if (creditScore >= 750) return { label: 'Excellent', variant: 'default' };
    if (creditScore >= 700) return { label: 'Good', variant: 'default' };
    if (creditScore >= 600) return { label: 'Fair', variant: 'secondary' };
    if (creditScore >= 500) return { label: 'Poor', variant: 'destructive' };
    return { label: 'No Score', variant: 'outline' };
  };

  const badge = getCreditScoreBadge();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Borrow & Build Credit</h1>
        <p className="text-muted-foreground">Access loans and improve your on-chain credit profile</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Borrow Form */}
        <motion.div variants={itemVariants}>
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Request Loan</CardTitle>
              <CardDescription>Borrow SUI based on your credit score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="borrow-amount">Amount (SUI)</Label>
                <Input id="borrow-amount" type="number" placeholder="0.0" value={borrowAmount} onChange={(e) => setBorrowAmount(e.target.value)} min="0" step="0.01" disabled={isLoading} />
              </div>
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your Credit Score</span>
                  <span className="font-medium">{creditScore || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Borrowable</span>
                  <span className="font-medium">{parseFloat(maxBorrowLimit).toFixed(4)} SUI</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interest Rate</span>
                  <span className="font-medium">5-12% APR</span>
                </div>
              </div>
              <Button onClick={handleBorrow} disabled={isLoading || !isConnected || !!activeLoan} className="w-full btn-mooncreditfi">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : activeLoan ? 'Repay Current Loan First' : 'Borrow'}
              </Button>
              {!isConnected && <p className="text-sm text-muted-foreground text-center">Connect your wallet to borrow</p>}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Loan Card */}
        <motion.div variants={itemVariants}>
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Active Loan</CardTitle>
              <CardDescription>Current loan status and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeLoan ? (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Borrowed</span>
                      <span className="font-bold text-lg">{parseFloat(activeLoan.amount).toFixed(4)} SUI</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Interest Rate</span>
                      <span className="font-bold text-lg text-blue-500">{activeLoan.interestRate}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Total to Repay</span>
                      <span className="font-bold text-lg text-orange-500">{parseFloat(activeLoan.totalOwed).toFixed(6)} SUI</span>
                    </div>
                  </div>
                  <Button onClick={handleRepay} disabled={isLoading || !isConnected} className="w-full btn-mooncreditfi">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Repay Loan'}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">No active loans</p>
                  <p className="text-sm text-muted-foreground mt-1">Borrow SUI to build your credit score</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Credit Profile Card */}
      <motion.div variants={itemVariants}>
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Credit Profile</CardTitle>
            <CardDescription>Your on-chain credit score and loan history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Credit Score</p>
                <p className="text-4xl font-bold text-primary">{creditScore || 'N/A'}</p>
              </div>
              <div className="text-right">
                <Badge variant={badge.variant} className="mb-2">{badge.label}</Badge>
                <p className="text-xs text-muted-foreground">Based on {loanHistory.length} loans</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Loan History</h4>
              {loanHistory.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount (SUI)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">On Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loanHistory.map((loan) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.date}</TableCell>
                          <TableCell>{parseFloat(loan.amount).toFixed(4)}</TableCell>
                          <TableCell>
                            <Badge variant={loan.status === 'Repaid' ? 'default' : 'secondary'}>{loan.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {loan.onTime ? <CheckCircle className="h-4 w-4 text-green-500 ml-auto" /> : <XCircle className="h-4 w-4 text-red-500 ml-auto" />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No loan history yet</p>
                  <p className="text-sm">Borrow and repay to build your credit</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Borrow;
