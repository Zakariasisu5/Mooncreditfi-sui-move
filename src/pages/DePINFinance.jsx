import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import StatsCard from '@/components/StatsCard';
import { useWalletContext } from '@/contexts/WalletContext';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { Zap, Sun, Wifi, Car, DollarSign, TrendingUp, Users, Loader2, Shield, Award, ExternalLink, Search, Filter, X } from 'lucide-react';
import { EXPLORER_URL, DEPIN_FINANCE_OBJECT_ID } from '@/config/sui';
import { useDePINProject, useUserDePINNFTs } from '@/hooks/useContractData';
import { useTransactionExecution } from '@/hooks/useTransactionExecution';
import { DePINService } from '@/services/contractService';

const DePINFinance = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [fundingAmount, setFundingAmount] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minROI, setMinROI] = useState(0);
  const [minProgress, setMinProgress] = useState(0);
  const { isConnected, account: address } = useWalletContext();
  const { addNotification } = useNotifications();

  // Fetch real on-chain data
  const { data: depinProject, isLoading: isLoadingProject } = useDePINProject(DEPIN_FINANCE_OBJECT_ID);
  const { data: userNFTs, isLoading: isLoadingNFTs } = useUserDePINNFTs();
  const { executeTransaction, isPending, isConfirming } = useTransactionExecution();

  const isFunding = isPending || isConfirming;

  // Real on-chain data
  const totalUserInvestment = userNFTs?.reduce((sum, nft) => sum + nft.amount, 0) || 0;
  const userNFTCount = userNFTs?.length || 0;

  // Convert on-chain project to display format
  const projects = depinProject ? [{
    id: DEPIN_FINANCE_OBJECT_ID,
    name: depinProject.name || 'Solar Farm',
    category: 'Solar',
    description: depinProject.description || 'Decentralized solar energy infrastructure project',
    funding_goal: depinProject.targetAmount || 100000,
    funding_current: depinProject.currentAmount || 0,
    funding_progress: depinProject.fundingProgress || 0,
    roi: (depinProject.apy || 0),
    status: depinProject.isActive ? 'active' : 'inactive',
    image: '/placeholder.svg'
  }] : [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  const categoryIcons = {
    'Solar': Sun, 'WiFi': Wifi, 'Mobility': Car, 'IoT': Zap,
    'Energy Storage': Zap, 'Telecom': Wifi, 'Other': Zap
  };

  const handleClaimYield = async () => {
    toast.info('Yield claiming coming soon');
  };

  const handleFundClick = (project) => {
    if (!isConnected) { toast.error('Please connect your wallet first'); return; }
    setSelectedProject(project.id);
    setModalOpen(true);
  };

  const handleConfirmFunding = async () => {
    if (!fundingAmount || parseFloat(fundingAmount) < 0.01) { 
      toast.error('Minimum contribution is 0.01 SUI'); 
      return; 
    }
    
    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;

    try {
      const amount = parseFloat(fundingAmount);
      
      // Create real transaction using DePINService
      const tx = DePINService.createFundProjectTransaction(selectedProject, amount);
      
      await executeTransaction(tx, {
        onSuccess: (digest) => {
          toast.success(`Successfully funded ${project.name}!`);
          addNotification(`Funded ${project.name} with ${amount} SUI`, 'success');
          setFundingAmount('');
          setSelectedProject(null);
          setModalOpen(false);
        },
        onError: (error) => {
          toast.error('Transaction failed: ' + (error.message || 'Unknown error'));
        },
      });
    } catch (error) {
      toast.error('Transaction failed: ' + (error.message || 'Unknown error'));
    }
  };

  const totalFinanced = projects.reduce((sum, p) => sum + parseFloat(p.funding_current || 0), 0);
  const chartData = projects.map(p => ({ name: p.category, value: parseFloat(p.funding_current || 0) }));
  const categories = [...new Set(projects.map(p => p.category))];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) || project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter;
    const matchesROI = project.roi >= minROI;
    const matchesProgress = project.funding_progress >= minProgress;
    return matchesSearch && matchesCategory && matchesROI && matchesProgress;
  });

  const clearFilters = () => { setSearchQuery(''); setCategoryFilter('all'); setMinROI(0); setMinProgress(0); };
  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || minROI > 0 || minProgress > 0;

  const loading = isLoadingProject || isLoadingNFTs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold mooncreditfi-glow">DePIN Finance</h1>
        <Badge variant="outline" className="text-sm">Decentralized Physical Infrastructure</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="TVL" value={`${totalFinanced.toFixed(4)} SUI`} description="Total value locked" icon={DollarSign} trend={15.2} />
            <StatsCard title="Active Projects" value={projects.length.toString()} description="Live infrastructure projects" icon={TrendingUp} trend={8.7} />
            <StatsCard title="Your Investment" value={`${totalUserInvestment.toFixed(4)} SUI`} description={`${userNFTCount} NFT${userNFTCount !== 1 ? 's' : ''} owned`} icon={Award} />
            <StatsCard title="Avg APY" value={`${projects.length > 0 ? (projects.reduce((sum, p) => sum + p.roi, 0) / projects.length).toFixed(1) : '0'}%`} description="Average project yield" icon={TrendingUp} trend={12} />
          </div>

          {/* User NFTs */}
          {isConnected && userNFTs && userNFTs.length > 0 && (
            <Card className="card-glow border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Your DePIN NFTs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userNFTs.map((nft, index) => (
                    <div key={nft.objectId} className="p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge variant="secondary" className="mb-2">NFT #{index + 1}</Badge>
                          <p className="text-sm text-muted-foreground">Investment Amount</p>
                          <p className="text-xl font-bold">{nft.amount.toFixed(4)} SUI</p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>Project: {nft.projectId.slice(0, 8)}...{nft.projectId.slice(-6)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-glow">
              <CardHeader><CardTitle>Financing Breakdown</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => [`$${(value / 1000000).toFixed(1)}M`, 'Value']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-64 text-muted-foreground">No data available</div>}
              </CardContent>
            </Card>
            <Card className="card-glow">
              <CardHeader><CardTitle>Project Categories</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {projects.slice(0, 4).map((project) => {
                  const Icon = categoryIcons[project.category] || Zap;
                  return (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <div><p className="font-medium">{project.category}</p><p className="text-sm text-muted-foreground">{project.name}</p></div>
                      </div>
                      <div className="text-right"><p className="font-semibold">${(parseFloat(project.funding_current) / 1000000).toFixed(1)}M</p><p className="text-sm text-muted-foreground">{project.funding_progress}%</p></div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Available Projects */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold">Available Projects</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{filteredProjects.length} of {projects.length} projects</span>
                {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4 mr-1" />Clear</Button>}
              </div>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><Filter className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Min ROI</span><span className="font-medium">{minROI}%+</span></div>
                    <Slider value={[minROI]} onValueChange={(value) => setMinROI(value[0])} max={20} step={1} className="w-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Min Progress</span><span className="font-medium">{minProgress}%+</span></div>
                    <Slider value={[minProgress]} onValueChange={(value) => setMinProgress(value[0])} max={100} step={5} className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredProjects.length === 0 ? (
              <Card className="card-glow">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                  <p className="text-muted-foreground text-center mb-4">Try adjusting your filters or search terms</p>
                  <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredProjects.map((project) => {
                  const Icon = categoryIcons[project.category] || Zap;
                  const iconColors = { 'Solar': 'text-yellow-500', 'WiFi': 'text-blue-500', 'Mobility': 'text-purple-500', 'IoT': 'text-green-500', 'Energy Storage': 'text-orange-500', 'Telecom': 'text-cyan-500', 'Other': 'text-primary' };
                  return (
                    <Card key={project.id} className="card-glow hover:border-primary/50 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2"><Icon className={`h-5 w-5 ${iconColors[project.category] || 'text-primary'}`} /><CardTitle>{project.name}</CardTitle></div>
                          <Badge variant="outline">{project.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Funding Progress</span>
                            <span className="font-medium">${(parseFloat(project.funding_current) / 1000000).toFixed(2)}M / ${(parseFloat(project.funding_goal) / 1000000).toFixed(2)}M</span>
                          </div>
                          <Progress value={project.funding_progress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground"><span>{project.funding_progress}% funded</span><span>{project.roi}% ROI</span></div>
                        </div>
                        <Dialog open={modalOpen && selectedProject === project.id} onOpenChange={(open) => { setModalOpen(open); if (!open) { setSelectedProject(null); setFundingAmount(''); } }}>
                          <DialogTrigger asChild>
                            <Button onClick={() => handleFundClick(project)} disabled={!isConnected} className="w-full btn-mooncreditfi"><DollarSign className="h-4 w-4 mr-2" />Fund Now</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Fund {project.name}</DialogTitle>
                              <DialogDescription>Enter the amount you'd like to contribute. You'll receive a Proof-of-Impact NFT upon successful funding.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Funding Amount (SUI)</label>
                                <Input type="number" placeholder="0.00" step="0.01" min="0" value={fundingAmount} onChange={(e) => setFundingAmount(e.target.value)} />
                              </div>
                              {fundingAmount && parseFloat(fundingAmount) > 0 && (
                                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Estimated Ownership:</span><span className="font-semibold text-primary">{((parseFloat(fundingAmount) / (parseFloat(project.funding_current) + parseFloat(fundingAmount))) * 100).toFixed(4)}%</span></div>
                                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Expected ROI:</span><span className="font-semibold text-green-500">{project.roi}%</span></div>
                                </div>
                              )}
                              <Button onClick={handleConfirmFunding} disabled={!fundingAmount || parseFloat(fundingAmount) <= 0 || isFunding} className="w-full btn-mooncreditfi">
                                {isFunding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Shield className="h-4 w-4 mr-2" />Confirm Funding</>}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DePINFinance;
