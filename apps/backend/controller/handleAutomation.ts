import { Request, Response } from "express";
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

export default async function handleAutomation(req: Request, res: Response) {
  const { originAddress, destinationAddress } = req.body;

  try {
    // Verify contract on Etherscan using fetch
    const etherscanUrl = `https://api.etherscan.io/api?module=contract&action=getabi&address=${originAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;

    const etherscanResponse = await fetch(etherscanUrl);
    
    if (!etherscanResponse.ok) {
      return res.status(400).json({ message: 'Failed to fetch contract from Etherscan' });
    }
    
    const etherscanData = await etherscanResponse.json();

    // Check if the contract is verified
    if (etherscanData.status !== '1') {
      return res.status(400).json({ message: 'Contract is not verified' });
    }

    const abi = JSON.parse(etherscanData.result);

    // Extract and format events, including full event ABIs
    const events = abi
      .filter((item: any) => item.type === 'event')
      .map((item: any) => ({
        name: item.name,
        inputs: item.inputs,
        topic0: ethers.id(`${item.name}(${item.inputs.map((input: any) => input.type).join(',')})`),
        abi: item
      }));

    // Extract and format functions
    const functions = abi
      .filter((item: any) => item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure')
      .map((item: any) => ({
        name: item.name,
        inputs: item.inputs,
        abi: item
      }));

    console.log(functions,events);  

    // Respond with extracted events (including ABIs) and functions
    return res.json({ events, functions });

  } catch (error) {
    console.error('Error processing contract:', error);
    if (error.name === 'FetchError') {
      // Handle fetch-specific error
      console.error('Fetch error', error.message);
    } else {
      console.error('Error', error.message);
    }
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}
