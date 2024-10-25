import { API_ENDPOINTS } from '../../data/constants';
import { AutomationType } from '../../types/Automation';

interface GenerateContractParams {
  automations: AutomationType[];
  chainId: string;
  originAddress: string;
  destinationAddress: string;
  isPausable: boolean;
}

export async function generateContract({
  automations,
  chainId,
  originAddress,
  destinationAddress,
  isPausable,
}: GenerateContractParams) {
  const response = await fetch(API_ENDPOINTS.GENERATE_CONTRACT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topicFunctionPairs: automations.map(({ topic0, function: func }) => ({ 
        topic0, 
        function: func 
      })),
      chainId: parseInt(chainId),
      originContract: originAddress,
      destinationContract: destinationAddress,
      isPausable,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate contract');
  }

  return await response.json();
}