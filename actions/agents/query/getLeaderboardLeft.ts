'use server';

import { Agent, ApiAgent } from '@/lib/types';
import { Abi } from 'starknet';

export async function getLeaderboardLeft(limit: number = 10) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    const apiKey = process.env.API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error('Missing API configuration');
    }

    const response = await fetch(
      `${apiUrl}/api/leaderboard/left-curve?limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
      },
    );



    const data = await response.json();

  

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status >= 500) {
        throw new Error('Server error - please try again later');
      }
      throw new Error(data.message || 'Failed to fetch left leaderboard');
    }

    // Map the response data to include profile picture URL
    const mappedData = data.data.map(
      (agent: ApiAgent): Omit<Agent, 'abi'> & { abi: Abi } => ({
        id: agent.id,
        name: agent.name,
        symbol: agent.name.substring(0, 4).toUpperCase(),
        type: agent.curveSide === 'LEFT' ? 'leftcurve' : 'rightcurve',
        status: agent.status === 'RUNNING' ? 'live' : 'bonding',
        price: agent.LatestMarketData?.price || 0,
        marketCap: agent.LatestMarketData?.marketCap || 0,
        holders: agent.LatestMarketData?.holders || 0,
        creator: agent.Wallet?.deployedAddress
          ? `0x${agent.Wallet.deployedAddress}`
          : 'unknown',
        createdAt: agent.createdAt,
        creativityIndex: agent.degenScore || 0,
        performanceIndex: agent.winScore || 0,
        profilePicture: agent.profilePicture || undefined,
        profilePictureUrl: agent.profilePicture
          ? `/uploads/profile-pictures/${agent.profilePicture}`
          : undefined,
        contractAddress: (agent.Token?.contractAddress ||
          '0x0') as `0x${string}`,
        abi: [],
      }),
    );

    return {
      success: true,
      data: mappedData as Agent[],
    };
  } catch (error) {
    console.error('Error fetching left leaderboard:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
