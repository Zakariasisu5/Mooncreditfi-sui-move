import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Gift, Coins, Award, RefreshCw, ExternalLink, Loader2, CheckCircle2, Info } from 'lucide-react';
import { useWalletContext } from '@/contexts/WalletContext';
import { EXPLORER_URL } from '@/config/sui';

const DePINFundingComponent = () => {
  const { account, isConnected } = useWalletContext();
  const [amount, setAmount] = useState('0.01');
  const [isContributing, setIsContributing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  // Mock data — replace with real Sui object queries once Move contracts are deployed
  const isLoadingContributor = false;
  const isLoadingPool = false;
  const userData = null;
  const pool = null;
  const ownershipPercentage = 0;

  const handleContribute = async () => {
    if (!isConnected) { toast.error('Please connect your wallet first'); return; }
    if (parseFloat(amount) < 0.01) { toast.error('Minimum contribution is 0.01 SUI'); return; }
    setIsContributing(true);
    try {
      // TODO: Build real Sui Transaction when Move contracts are deployed
      toast.info('Move contracts not yet deployed — contribution simulated');
    } catch (error) {
      toast.error('Contribution failed');
    } finally {
      setIsContributing(false);
    }
  };

  const handleClaimYield = async () => {
    if (!userData || !userData.pendingYield || userData.pendingYield === '0') { toast.error('No yield to claim'); return; }
    setIsClaiming(true);
    try {
      toast.info('Move contracts not yet deployed — claim simulated');
    } catch (error) {
      toast.error('Claim failed');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isConnected) return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">Connect your wallet to contribute</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" />Fund DePIN Infrastructure</CardTitle>
          <CardDescription>Contribute SUI to earn yields and mint your Proof-of-Impact NFT</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-3">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="0.01" step="0.01" className="text-lg h-12" />
            <Button onClick={handleContribute} disabled={isContributing} className="h-12 px-6">
              {isContributing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><TrendingUp className="h-4 w-4 mr-2" />Contribute</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Your Contribution</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoadingContributor ? <Skeleton className="h-20 w-full" /> : userData ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Your Shares</p><p className="text-2xl font-bold">{userData.shares} SUI</p></div>
                <div><p className="text-sm text-muted-foreground">Ownership</p><p className="text-2xl font-bold">{ownershipPercentage.toFixed(2)}%</p></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div><p className="text-sm text-muted-foreground">Pending Yield</p><p className="text-xl font-bold text-green-600">{userData.pendingYield} SUI</p></div>
                <Button variant="outline" onClick={handleClaimYield} disabled={isClaiming || userData.pendingYield === '0'}>
                  {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} Claim
                </Button>
              </div>
            </>
          ) : <p className="text-center text-muted-foreground py-6">No contributions yet</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Pool Stats</CardTitle></CardHeader>
        <CardContent>
          {isLoadingPool ? <Skeleton className="h-20 w-full" /> : pool ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg"><p className="text-sm text-muted-foreground">Total Contributions</p><p className="text-lg font-bold">{pool.totalContributions} SUI</p></div>
              <div className="p-4 bg-muted/50 rounded-lg"><p className="text-sm text-muted-foreground">Yields Distributed</p><p className="text-lg font-bold text-green-600">{pool.totalYieldsDistributed} SUI</p></div>
            </div>
          ) : <p className="text-center text-muted-foreground">No pool data available — contracts not yet deployed</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default DePINFundingComponent;
