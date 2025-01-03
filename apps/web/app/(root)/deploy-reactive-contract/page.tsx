"use client"

import React, { useState, useEffect } from 'react';
import AutomationForm from '@/components/automation/SCAutomation/AutomationForm';
import ContractDisplay from '@/components/automation/SCAutomation/ContractDispaly';
import { useAutomationContext } from '@/app/_context/AutomationContext';
import { useContractGeneration } from '@/hooks/automation/useContractGeneration';
import { useWeb3 } from '@/app/_context/Web3Context';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NETWORK_NAMES: { [key: number]: string } = {
  5318008: 'Kopli', // Assuming this is the chain ID for Kopli
  // Add other network names if needed
};

export default function AutomationPage() {
  const [showContract, setShowContract] = useState(false);
  const [editingContract, setEditingContract] = useState(false);
  const [editedContract, setEditedContract] = useState('');
  const [abi, setAbi] = useState<any>(null);
  const [bytecode, setBytecode] = useState('');
  const [deployedAddress, setDeployedAddress] = useState('');
  const [compileError, setCompileError] = useState<string | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deploymentTxHash, setDeploymentTxHash] = useState<string | null>(null);
  const [isValidForm, setIsValidForm] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle')

  const { toast } = useToast()

  const {
    OrgChainId,
    DesChainId,
    automations,
    reactiveContract,
    setReactiveContract,
    originAddress,
    destinationAddress,
    isPausable,
  } = useAutomationContext();

  const { account, web3 } = useWeb3();

  const { generateContractTemplate, isLoading, error } = useContractGeneration({
    onSuccess: (contract) => {
      setReactiveContract(contract);
      setEditedContract(contract);
    },
  });

  const isEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  useEffect(() => {
    validateForm();
  }, [automations, OrgChainId, DesChainId, originAddress, destinationAddress]);

  const validateForm = () => {
    const isValidAutomations = automations.every(automation => {
      const eventRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\((address|uint256|string|bool|bytes32|uint8)(\s*,\s*(address|uint256|string|bool|bytes32|uint8))*\)$/;
      const functionRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*\(address(\s*,\s*(address|uint256|string|bool|bytes32|uint8))*\)$/;
      return eventRegex.test(automation.event) && functionRegex.test(automation.function);
    });
    
    // console.log('isValidAutomations:', isValidAutomations);
    const isValidAddresses = isEthereumAddress(originAddress) && isEthereumAddress(destinationAddress);
    // console.log('isValidAddresses:', isValidAddresses);
  
    const isValidChainIds = !isNaN(Number(OrgChainId)) && !isNaN(Number(DesChainId));
    // console.log('isValidChainIds:', isValidChainIds);
  
    setIsValidForm(isValidAutomations && isValidAddresses && isValidChainIds);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidForm) {
      await generateContractTemplate({
        automations,
        OrgChainId: Number(OrgChainId),
        DesChainId: Number(DesChainId),
        originAddress,
        destinationAddress,
        isPausable,
      });
    }
  };

  const handleSaveEditedContract = () => {
    setReactiveContract(editedContract);
    setEditingContract(false);
  };

  const handleContractChange = (value: string) => {
    setEditedContract(value);
  };

  const handleCompile = async () => {
    setCompileError(null);
    try {
      const response = await fetch('http://localhost:5000/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceCode: editedContract }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compile contract');
      }

      const { abi, bytecode } = await response.json();
      if (!abi || !bytecode) {
        throw new Error('Compilation successful, but ABI or bytecode is missing');
      }
      setAbi(abi);
      setBytecode(bytecode);
    } catch (error: any) {
      console.error('Error in compile:', error);
      setCompileError(error.message);
    }
  };

  const getNetworkName = async (web3: any) => {
    try {
      const chainId = await web3.eth.getChainId()
      return NETWORK_NAMES[chainId] || `Chain ID: ${chainId}`
    } catch (error) {
      console.error('Error getting network name:', error)
      return 'Unknown Network'
    }
  }

  const handleDeploy = async () => {
    if (!web3 || !account || !abi || !bytecode) {
      toast({
        variant: "destructive",
        title: "Deployment Error",
        description: "Missing required deployment configuration",
      })
      return
    }

    setDeploymentStatus('deploying')
    setDeploymentError(null)

    try {
      // Create new contract instance
      const contract = new web3.eth.Contract(abi)
      
      // Get network name before deployment
      const networkName = await getNetworkName(web3)
      
      // Check if the network is Kopli
      if (networkName !== 'Kopli') {
        throw new Error('Deployment is only allowed on the Kopli network')
      }

      // Prepare deployment transaction
      const deploy = contract.deploy({
        data: bytecode,
        arguments: []
      })

      // Estimate gas
      const gasEstimate = await deploy.estimateGas({ from: account })
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2)
      const gasPrice = await web3.eth.getGasPrice()

      // Check balance
      const balance = await web3.eth.getBalance(account)
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice)

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${web3.utils.fromWei(requiredBalance.toString(), 'ether')} ETH`)
      }

      let transactionHash = ''
      
      // Deploy with event tracking
      const deployedContract = await new Promise((resolve, reject) => {
        deploy.send({
          from: account,
          gas: String(gasLimit),
          gasPrice: String(gasPrice),
        })
        .on('transactionHash', (hash: string) => {
          console.log('Transaction Hash:', hash)
          transactionHash = hash
          setDeploymentTxHash(hash)
        })
        .on('error', (error: any) => {
          reject(error)
        })
        .then(resolve)
      })

      // Update final deployment status
      if (deployedContract) {
        const contractAddress = (deployedContract as any).options.address
        setDeployedAddress(contractAddress)
        setDeploymentStatus('success')

        toast({
          title: "Deployment Successful",
          description: `Contract deployed at ${contractAddress} on ${networkName}`,
        })

        return {
          transactionHash,
          contractAddress,
          networkName
        }
      }

    } catch (error: any) {
      console.error('Deployment error:', error)
      setDeploymentStatus('error')
      setDeploymentError(error.message)
      toast({
        variant: "destructive",
        title: "Deployment Failed",
        description: error.message,
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-400 dark:from-blue-400 dark:to-teal-300">
          Create Your Automation
        </h1>
        
        <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-teal-400 text-white p-6 rounded-t-lg">
            <CardTitle className="text-2xl font-bold">
              Automation Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AutomationForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
              isValidForm={isValidForm}
            />
          </CardContent>
        </Card>

        {reactiveContract && (
          <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-400 text-white p-6 rounded-t-lg">
              <CardTitle className="text-2xl font-bold">
                Smart Contract
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ContractDisplay
                reactiveContract={reactiveContract}
                editedContract={editedContract}
                showContract={showContract}
                editingContract={editingContract}
                onToggleShow={() => setShowContract(!showContract)}
                onEdit={() => setEditingContract(true)}
                onSave={handleSaveEditedContract}
                onCancelEdit={() => setEditingContract(false)}
                onContractChange={handleContractChange}
              />
              <div className="mt-6 space-y-4">
                <div className="flex justify-between">
                  <Button 
                    onClick={handleCompile} 
                    className="bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Compile Contract
                  </Button>
                  <Button 
                    type="submit"
                    onClick={handleSubmit} 
                    className="bg-green-500 hover:bg-green-600 text-white transition-colors duration-200"
                    disabled={isLoading || !isValidForm}
                  >
                    {isLoading ? 'Regenerating...' : 'ReGenerate Contract'}
                  </Button>
                </div>
                {abi && bytecode && (
                  <Button 
                    onClick={handleDeploy}  
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Deploy to KOPLI Network
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {compileError && (
          <Alert variant="destructive" className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTitle className="text-red-800 dark:text-red-200 font-semibold">
              Compilation Error
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              {compileError}
            </AlertDescription>
          </Alert>
        )}

        {deploymentError && (
          <Alert variant="destructive" className="bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTitle className="text-red-800 dark:text-red-200 font-semibold">
              Deployment Error
            </AlertTitle>
            <AlertDescription className="text-red-700 dark:text-red-300">
              {deploymentError}
            </AlertDescription>
          </Alert>
        )}

{deployedAddress && (
    <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 transition-all duration-200 hover:shadow-xl">
      <CardHeader className="bg-gradient-to-r from-green-500 to-teal-400 text-white p-6 rounded-t-lg">
        <CardTitle className="text-2xl font-bold">
          Deployment Successful
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
          <span className="text-gray-700 dark:text-gray-300 font-semibold">Contract Address:</span>
          <span className="font-mono text-blue-600 dark:text-blue-400">{deployedAddress}</span>
        </div>
        {deploymentTxHash && (
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
            <span className="text-gray-700 dark:text-gray-300 font-semibold">Transaction Hash:</span>
            <span className="font-mono text-blue-600 dark:text-blue-400">{deploymentTxHash}</span>
          </div>
        )}
        <Button 
          className="w-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200"
          onClick={() => window.open(`https://kopli.reactscan.net/tx/${deploymentTxHash}`, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View on Explorer
        </Button>
      </CardContent>
    </Card>
  )}
      </div>
    </div>
  );

};
