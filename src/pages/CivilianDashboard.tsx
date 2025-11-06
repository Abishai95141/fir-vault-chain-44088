import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useWeb3 } from '@/hooks/useWeb3';
import { FileText, Plus, ExternalLink, Shield } from 'lucide-react';
import { FIRData, FIRStatus } from '@/types/fir';
import { getBlockchainExplorerUrl } from '@/lib/web3-utils';
import { getIPFSGatewayUrl } from '@/lib/ipfs-utils';

const CivilianDashboard = () => {
  const { user } = useAuth();
  const { account } = useWeb3();
  const [firs, setFirs] = useState<FIRData[]>([]);

  useEffect(() => {
    const fetchUserFIRs = async () => {
      if (!account) {
        setFirs([]);
        return;
      }

      try {
        const { queryAllFIRSubmittedEvents } = await import('@/lib/web3-utils');
        const { fetchFromIPFS } = await import('@/lib/ipfs-utils');
        
        // Get all FIR events from blockchain
        const events = await queryAllFIRSubmittedEvents();
        
        // Filter events by current user's wallet address
        const userEvents = events.filter(
          event => event.submitter.toLowerCase() === account.toLowerCase()
        );
        
        // Fetch full FIR data from IPFS for each event
        const firPromises = userEvents.map(async (event) => {
          try {
            const ipfsData = await fetchFromIPFS(event.dataCID);
            const { generateFIRId } = await import('@/lib/web3-utils');
            
            // For backward compatibility: use id from IPFS if available, 
            // otherwise generate from the data (for old FIRs)
            const firId = ipfsData.id || generateFIRId(ipfsData);
            
            return {
              ...ipfsData,
              id: firId, // Ensure id is set
              blockchainTxHash: event.transactionHash,
              createdAt: ipfsData.createdAt || new Date().toISOString()
            };
          } catch (error) {
            console.error(`Error fetching IPFS data for event:`, error);
            return null;
          }
        });
        
        const firs = (await Promise.all(firPromises)).filter(Boolean) as FIRData[];
        setFirs(firs);
      } catch (error) {
        console.error('Error fetching FIRs:', error);
        setFirs([]);
      }
    };

    fetchUserFIRs();
  }, [account]);

  const getStatusBadgeVariant = (status?: FIRStatus) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'under_investigation': return 'default';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-muted py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My FIRs</h1>
            <p className="text-muted-foreground">
              View and track your submitted First Information Reports
            </p>
          </div>
          <Link to="/fir-submission">
            <Button variant="hero">
              <Plus className="mr-2 h-4 w-4" />
              File New FIR
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total FIRs</CardDescription>
              <CardTitle className="text-3xl">{firs.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl">
                {firs.filter(f => f.status === 'pending').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Under Investigation</CardDescription>
              <CardTitle className="text-3xl">
                {firs.filter(f => f.status === 'under_investigation').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* FIRs List */}
        {firs.length === 0 ? (
          <Card className="shadow-medium">
            <CardContent className="py-16">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No FIRs Yet</h3>
                <p className="text-muted-foreground mb-6">
                  You haven't filed any FIRs yet. Start by filing your first report.
                </p>
                <Link to="/fir-submission">
                  <Button variant="hero">
                    <Plus className="mr-2 h-4 w-4" />
                    File Your First FIR
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {firs.map((fir) => (
              <Card key={fir.id} className="shadow-soft hover:shadow-medium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {fir.incidentType?.replace('_', ' ').toUpperCase()}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(fir.status)}>
                          {fir.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {fir.incidentDescription?.substring(0, 150)}...
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Location:</span> {fir.location}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {fir.incidentDate}
                        </div>
                        <div>
                          <span className="font-medium">Submitted:</span>{' '}
                          {fir.createdAt && new Date(fir.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {fir.blockchainTxHash && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <Shield className="h-4 w-4 text-success" />
                          <a 
                            href={getBlockchainExplorerUrl(fir.blockchainTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View on Blockchain
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <Link to={`/status-check?id=${fir.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Shield className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold mb-1">Your FIRs are Secure</h4>
                <p className="text-sm text-muted-foreground">
                  All your FIRs are stored on IPFS and hashed on the blockchain, making them immutable
                  and tamper-proof. You can verify any FIR's authenticity using the blockchain explorer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CivilianDashboard;
