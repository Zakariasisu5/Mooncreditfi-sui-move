import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Wallet, TrendingUp, Gift, Coins, Award, ExternalLink, Loader2, Info, DollarSign } from 'lucide-react';
import { EXPLORER_URL, DEPIN_PROJECTS } from '@/config/sui';
import { useDePINProjects, useUserDePINNFTs, useInvalidateQueries } from '@/hooks/useContractData';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSecureTransaction } from '@/hooks/useSecureTransaction';
import { useQueryClient } from '@tanstack/react-query';

const DePINFundingComponent = ({ isLoading: parentLoading = false }) => {
  const account = useCurrentAccount();
  const isConnected = !!account;
  const userAddress = account?.address;
  const queryClient = useQueryClient();
  const { invalidateAll } = useInvalidateQueries();
  const { executeSecureTransaction, isPending, isConfirming } = useSecureTransaction();

  const [amount, setAmount] = useState('0.01');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);

  // Fetch real DePIN projects from blockchain
  const { data: projects, isLoading: isLoadingProjects } = useDePINProjects(DEPIN_PROJECTS);
  const { data: userNFTs, isLoading: isLoadingNFTs } = useUserDePINNFTs();

  // Get the selected project
  const project = projects?.[selectedProjectIndex];
  const projectId = DEPIN_PROJECTS[selectedProjectIndex]?.id;

  // Calculate user's contribution from NFTs
  const userContribution = userNFTs?.reduce((total, nft) => {
    if (nft.projectId === projectId) {
      return total + nft.amount;
    }
    return total;
  }, 0) || 0;

  // Calculate user's revenue share
  const userRevenueShare = project && project.totalFunded > 0 && userContribution > 0
    ? (project.totalRevenue * userContribution) / project.totalFunded
    : 0;

  // Calculate ownership percentage
  const ownershipPercentage = project && project.totalFunded > 0
    ? (userContribution / project.totalFunded) * 100
    : 0;

  const isTransacting = isProcessing || parentLoading || isPending || isConfirming;

  const handleContribute = async () => {
    // Prevent multiple clicks
    if (isTransacting) {
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (parseFloat(amount) < 0.01) {
      toast.error('Minimum contribution is 0.01 SUI');
      return;
    }

    if (!projectId) {
      toast.error('Project not found');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement DePIN funding transaction
      // const tx = DePINService.fundProjectTransaction(projectId, parseFloat(amount));
      // await executeSecureTransaction(tx, { ... });
      
      toast.info('DePIN funding transaction coming soon');
      setTimeout(() => {
        invalidateAll();
        queryClient.invalidateQueries({ queryKey: ['depinProjects'] });
        queryClient.invalidateQueries({ queryKey: ['userDePINNFTs'] });
      }, 2000);
    } catch (error) {
      console.error('Contribution error:', error);
      toast.error('Contribution failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimRevenue = async () => {
    // Prevent multiple clicks
    if (isTransacting) {
      return;
    }

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!userRevenueShare || userRevenueShare === 0) {
      toast.error('No revenue to claim');
      return;
    }

    if (!userNFTs || userNFTs.length === 0) {
      toast.error('No DePIN NFT found');
      return;
    }

    setIsProcessing(true);
    try {
      // TODO: Implement revenue distribution transaction
      // const userNFT = userNFTs.find(nft => nft.projectId === projectId);
      // const tx = DePINService.distributeRevenueTransaction(projectId, userNFT.objectId);
      // await executeSecureTransaction(tx, { ... });
      
      toast.info('Revenue distribution transaction coming soon');
      setTimeout(() => {
        invalidateAll();
        queryClient.invalidateQueries({ queryKey: ['depinProjects'] });
        queryClient.invalidateQueries({ queryKey: ['userDePINNFTs'] });
      }, 2000);
    } catch (error) {
      console.error('Revenue claim error:', error);
      toast.error('Revenue claim failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">Connect your wallet to contribute</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingProjects || isLoadingNFTs) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Info className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">No DePIN projects available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Select DePIN Project
          </CardTitle>
          <CardDescription>
            Choose an infrastructure project to fund
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedProjectIndex.toString()} 
            onValueChange={(value) => setSelectedProjectIndex(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {DEPIN_PROJECTS.map((proj, index) => (
                <SelectItem key={proj.id} value={index.toString()}>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{proj.category}</Badge>
                    <span>{proj.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Project Info Card */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <CardTitle>{project.name}</CardTitle>
            </div>
            <Badge variant="secondary">{DEPIN_PROJECTS[selectedProjectIndex]?.category}</Badge>
          </div>
          <CardDescription>
            {DEPIN_PROJECTS[selectedProjectIndex]?.description || project.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Target Amount</p>
              <p className="font-bold text-sm">{project.targetAmount.toFixed(2)} SUI</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Current Amount</p>
              <p className="font-bold text-sm">{project.currentAmount.toFixed(2)} SUI</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">APY</p>
              <p className="font-bold text-sm text-green-600">{project.apy.toFixed(2)}%</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={project.isActive ? 'default' : 'secondary'}>
                {project.isActive ? 'Active' : 'Closed'}
              </Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="text-lg h-12"
              disabled={isTransacting || !project.isActive}
            />
            <Button
              onClick={handleContribute}
              disabled={isTransacting || !project.isActive}
              className="h-12 px-6"
            >
              {isTransacting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Contribute
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Contribution Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Your Contribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userContribution > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your Investment</p>
                  <p className="text-2xl font-bold">{userContribution.toFixed(2)} SUI</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ownership</p>
                  <p className="text-2xl font-bold">{ownershipPercentage.toFixed(2)}%</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">NFTs Owned</p>
                <p className="text-lg font-semibold">{userNFTs?.filter(nft => nft.projectId === projectId).length || 0}</p>
              </div>
            </>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No contributions yet. Contribute to earn yields and mint your Proof-of-Impact NFT.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Revenue Tracking Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Revenue Tracking
          </CardTitle>
          <CardDescription>
            Track project funding and revenue distribution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Funded</p>
              <p className="text-lg font-bold">{(project.totalFunded || 0).toFixed(2)} SUI</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold text-green-600">{(project.totalRevenue || 0).toFixed(2)} SUI</p>
            </div>
            {userContribution > 0 && (
              <>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Your Funding</p>
                  <p className="text-lg font-bold text-blue-600">{userContribution.toFixed(2)} SUI</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Your Revenue Share</p>
                  <p className="text-lg font-bold text-purple-600">{userRevenueShare.toFixed(2)} SUI</p>
                </div>
              </>
            )}
          </div>

          {userContribution > 0 && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div>
                <p className="text-sm text-muted-foreground">Proportional Share</p>
                <p className="text-xl font-bold text-primary">
                  {ownershipPercentage.toFixed(2)}%
                </p>
              </div>
              <Button
                onClick={handleClaimRevenue}
                disabled={isTransacting || userRevenueShare === 0}
              >
                {isTransacting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Gift className="h-4 w-4 mr-2" />
                    Claim Revenue
                  </>
                )}
              </Button>
            </div>
          )}

          {project.totalRevenue === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                No revenue has been generated yet. Revenue will be distributed proportionally to all contributors.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DePINFundingComponent;
