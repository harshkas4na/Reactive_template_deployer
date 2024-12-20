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
import { Loader2 } from "lucide-react";

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

  const handleDeploy = async () => {
    if (!web3 || !account) {
      console.error('Web3 or account not available');
      return;
    }

    try {
      const contract = new web3.eth.Contract(abi);
      const deployTransaction = contract.deploy({
        data: bytecode,
        arguments: []
      });
      console.log('Deploying contract:', deployTransaction);
      const gasEstimate = await deployTransaction.estimateGas({ from: account });
      const gasLimit = Math.ceil(Number(gasEstimate) * 1.2);
      const gasPrice = await web3.eth.getGasPrice();

      const balance = await web3.eth.getBalance(account);
      const requiredBalance = BigInt(gasLimit) * BigInt(gasPrice);

      if (BigInt(balance) < requiredBalance) {
        throw new Error(`Insufficient balance. Required: ${web3.utils.fromWei(requiredBalance.toString(), 'ether')} ETH`);
      }

      const deployedContract = await deployTransaction.send({
        from: account,
        gas: String(gasLimit),
        gasPrice: String(gasPrice),
      });
      // console.log('Contract deployed:', deployedContract);
      setDeployedAddress(String(deployedContract.options.address));
      // setDeploymentTxHash(deployTransaction);

      const code = await web3.eth.getCode(String(deployedContract.options.address));
      if (code === '0x' || code === '0x0') {
        throw new Error('Contract deployment failed - no code at contract address');
      }

    } catch (error: any) {
      console.error('Deployment error details:', error);
      setDeploymentError(`Failed to deploy contract: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-200 
      dark:bg-gray-900 text-gray-100 
      bg-gray-100
      py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center 
          dark:text-gray-100 
          text-gray-900">
          Create Your Automation
        </h1>
        
        <Card className="border transition-colors
          dark:bg-gray-800 dark:border-gray-700
          light:bg-white light:border-gray-200">
          <CardHeader>
            <CardTitle className="dark:text-gray-100 light:text-gray-900">
              Automation Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AutomationForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
              isValidForm={isValidForm}
            />
          </CardContent>
        </Card>

        {reactiveContract && (
          <Card className="border transition-colors
            dark:bg-gray-800 dark:border-gray-700
            light:bg-white light:border-gray-200">
            <CardHeader>
              <CardTitle className="dark:text-gray-100 light:text-gray-900">
                Smart Contract
              </CardTitle>
            </CardHeader>
            <CardContent>
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
              <div className="mt-4">
                <div className="flex justify-between">
                  <Button 
                    onClick={handleCompile} 
                    className="transition-colors
                      dark:hover:bg-gray-700 dark:text-gray-100
                      light:hover:bg-gray-100 light:text-gray-900" 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Compile Contract
                  </Button>
                  <Button 
                    type="submit"
                    onSubmit={handleSubmit} 
                    className="transition-colors
                      dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-gray-100
                      light:bg-blue-500 light:hover:bg-blue-600 light:text-white" 
                    disabled={isLoading || !isValidForm}
                  >
                    {isLoading ? 'Regenerating...' : 'ReGenerate Contract'}
                  </Button>
                </div>
                {abi && bytecode && (
                  <div className="inline-block mt-8">
                    <Button 
                      onClick={handleDeploy}  
                      className="transition-colors
                        dark:hover:bg-gray-700 dark:text-gray-100
                        light:hover:bg-gray-100 light:text-gray-900" 
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Deploy to KOPLI Network
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {compileError && (
          <Alert variant="destructive" className="dark:bg-red-900 light:bg-red-100">
            <AlertTitle className="dark:text-red-100 light:text-red-900">
              Compilation Error
            </AlertTitle>
            <AlertDescription className="dark:text-red-200 light:text-red-800">
              {compileError}
            </AlertDescription>
          </Alert>
        )}

        {deploymentError && (
          <Alert variant="destructive" className="dark:bg-red-900 light:bg-red-100">
            <AlertTitle className="dark:text-red-100 light:text-red-900">
              Deployment Error
            </AlertTitle>
            <AlertDescription className="dark:text-red-200 light:text-red-800">
              {deploymentError}
            </AlertDescription>
          </Alert>
        )}

        {deployedAddress && (
          <Card className="border transition-colors
            dark:bg-gray-800 dark:border-gray-700
            light:bg-white light:border-gray-200">
            <CardHeader>
              <CardTitle className="dark:text-gray-100 light:text-gray-900">
                Deployment Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 dark:text-gray-300 light:text-gray-700">
                Contract Address: {deployedAddress}
              </p>
              {deploymentTxHash && (
                <p className="dark:text-gray-300 light:text-gray-700">
                  Transaction: 
                  <a 
                    href={`https://kopli.reactscan.net/tx/${deploymentTxHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="ml-1 dark:text-blue-400 dark:hover:text-blue-300 light:text-blue-600 light:hover:text-blue-700 hover:underline"
                  >
                    View on Block Explorer
                  </a>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
