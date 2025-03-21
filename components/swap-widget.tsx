'use client';

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Agent } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownUp, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useWalletStatus } from '@/hooks/use-wallet-status';
import { useContractAbi } from '@/utils/abi';
import { useBuyTokens, useSellTokens } from '@/hooks/use-token-transactions';
import { useContract } from '@starknet-react/core';

interface SwapWidgetProps {
  agent: Agent;
  className?: string;
  onTransactionSuccess?: () => void;
}

interface SwapInputProps {
  label: string;
  balance: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  estimate?: string;
  isLeftCurve: boolean;
}

const SwapInput = memo(
  ({
    label,
    balance,
    value,
    onChange,
    readOnly,
    estimate,
    isLeftCurve,
  }: SwapInputProps) => (
    <div
      className={cn(
        'rounded-lg border-2 p-3 space-y-2',
        isLeftCurve
          ? 'bg-yellow-500/5 border-yellow-500/20'
          : 'bg-purple-500/5 border-purple-500/20',
      )}
    >
      <div className="flex items-center justify-between text-sm">
        <label className="text-xs text-muted-foreground">{label}</label>
      </div>
      <Input
        type="number"
        placeholder="0.0"
        value={value}
        onChange={onChange && ((e) => onChange(e.target.value))}
        readOnly={readOnly}
        className="border-0 bg-transparent text-lg font-mono p-0"
      />
      <div className="flex justify-end">
        <span className="font-mono text-[10px] text-right text-muted-foreground">
          {estimate ? `≈ $${estimate}` : `${balance}`}
        </span>
      </div>
    </div>
  ),
);
SwapInput.displayName = 'SwapInput';

const ErrorMessage = memo(
  ({ message, isLeftCurve }: { message: string; isLeftCurve: boolean }) => (
    <div
      className={cn(
        'text-xs px-3 py-1.5 rounded-lg flex items-center gap-2.5 transition-all',
        isLeftCurve
          ? 'bg-yellow-500/10 text-foreground'
          : 'bg-purple-500/10 text-foreground',
      )}
    >
      <div
        className={cn(
          'min-w-4 h-4 rounded-full flex items-center justify-center',
          isLeftCurve ? 'text-yellow-500/90' : 'text-purple-500/90',
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <span className="opacity-90 font-medium tracking-tight">{message}</span>
    </div>
  ),
);
ErrorMessage.displayName = 'ErrorMessage';

const SwapDivider = memo(({ isLeftCurve }: { isLeftCurve: boolean }) => (
  <div className="relative py-2">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-border" />
    </div>
  </div>
));
SwapDivider.displayName = 'SwapDivider';

export const SwapWidget = memo(
  ({ agent, className, onTransactionSuccess }: SwapWidgetProps) => {
    const [amount, setAmount] = useState('');
    const [debouncedAmount, setDebouncedAmount] = useState('');
    const [simulatedEthAmount, setSimulatedEthAmount] = useState('');
    const [convertedTokenAmount, setConvertedTokenAmount] = useState('');
    const [activeTab, setActiveTab] = useState('buy');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [ethBalance, setEthBalance] = useState('0');
    const [tokenBalance, setTokenBalance] = useState('0');

    const { address, isContractReady } = useWalletStatus(agent.contractAddress);
    const { toast } = useToast();

    // Use our custom ABI hook to handle proxy contracts
    const {
      abi,
      error: abiError,
      isLoading: isAbiLoading,
    } = useContractAbi(agent.contractAddress);

    // Get contract instance
    const { contract } = useContract({
      abi: abi || agent.abi,
      address: agent.contractAddress as `0x0${string}`,
    });

    // Add ETH contract hook
    const { contract: ethContract } = useContract({
      address:
        '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
      abi: [
        {
          type: 'function',
          name: 'balanceOf',
          inputs: [{ name: 'account', type: 'felt' }],
          outputs: [{ type: 'Uint256' }],
          state_mutability: 'view',
        },
      ],
    });

    // Use transaction hooks
    const { buyTokens } = useBuyTokens({
      address: agent.contractAddress,
      abi: abi || agent.abi,
    });

    const { sellTokens } = useSellTokens({
      address: agent.contractAddress,
      abi: abi || agent.abi,
    });

    const isInitializing = isAbiLoading || !buyTokens || !sellTokens;

    // 3. All derived values
    const isLeftCurve = agent.type === 'leftcurve';

    // 4. All useEffect hooks
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedAmount(amount);
      }, 1000);
      return () => clearTimeout(timer);
    }, [amount]);

    useEffect(() => {
      const simulateSwap = async () => {
        if (
          !debouncedAmount ||
          !agent.id ||
          !address ||
          isInitializing ||
          !contract
        ) {
          setSimulatedEthAmount('');
          setConvertedTokenAmount('');
          setError(null);
          return;
        }

        setIsLoading(true);
        const startTime = performance.now();

        try {
          const inputAmount = parseFloat(debouncedAmount);
          if (isNaN(inputAmount) || inputAmount <= 0) {
            setSimulatedEthAmount('');
            setConvertedTokenAmount('');
            setError(null);
            return;
          }

          // Convert input amount to token decimals (6)
          const tokenAmount =
            activeTab === 'buy'
              ? BigInt(Math.floor(inputAmount * 1e6)).toString()
              : BigInt(Math.floor(inputAmount * 1e6)).toString();

          setConvertedTokenAmount(tokenAmount);

          // Direct contract call for simulation
          const result = await contract.call(
            activeTab === 'buy' ? 'simulate_buy' : 'simulate_sell',
            [tokenAmount],
          );

          if (result) {
            // Extract the first value from the result array
            const simulatedAmount =
              Array.isArray(result) && result.length > 0
                ? result[0].toString()
                : typeof result === 'object' && result !== null
                ? Object.values(result)[0]?.toString() || ''
                : result?.toString() || '';

            if (simulatedAmount && !isNaN(Number(simulatedAmount))) {
              setSimulatedEthAmount(simulatedAmount);
              setError(null);
            } else {
              setSimulatedEthAmount('');
              setError('Invalid simulation result format');
              console.error('❌ Invalid simulation amount:', simulatedAmount);
            }
          } else {
            setSimulatedEthAmount('');
            setError('Failed to simulate swap');
          }
        } catch (error: unknown) {
          console.error('❌ Simulation error:', {
            error,
            message: error instanceof Error ? error.message : String(error),
            elapsed: `${(performance.now() - startTime).toFixed(2)}ms`,
          });

          setSimulatedEthAmount('');

          // Handle specific contract errors
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('insufficient')) {
            setError('Insufficient liquidity in the bonding curve');
          } else if (errorMessage.includes('exceeds_balance')) {
            setError('Amount exceeds available balance');
          } else if (errorMessage.includes('reverted')) {
            setError('Transaction would revert - check your input amount');
          } else {
            setError('Failed to simulate swap');
          }
        } finally {
          setIsLoading(false);
        }
      };

      // Debounce the simulation to avoid too many calls
      const timer = setTimeout(simulateSwap, 1000);
      return () => clearTimeout(timer);
    }, [
      debouncedAmount,
      agent.id,
      activeTab,
      address,
      isInitializing,
      contract,
    ]);

    const fetchBalances = useCallback(async () => {
      try {
        if (!address || !ethContract || !contract) {
          setEthBalance('0');
          setTokenBalance('0');
          return;
        }

        // Fetch ETH balance using ETH contract
        const ethBalanceResult = await ethContract.balanceOf(address);
        setEthBalance(ethBalanceResult.toString());

        // Fetch token balance
        const tokenBalanceResult = await contract.balanceOf(address);
        setTokenBalance(tokenBalanceResult.toString());
      } catch (error) {
        console.error('Failed to fetch balances:', error);
        setEthBalance('0');
        setTokenBalance('0');
      }
    }, [address, ethContract, contract]);

    // Fetch balances only when dependencies change
    useEffect(() => {
      if (!isInitializing && address && ethContract && contract) {
        fetchBalances();
      }
    }, [address, ethContract, contract, isInitializing, fetchBalances]);

    // Handle swap
    const handleSwap = useCallback(async () => {
      // Clear any existing errors first
      setError(null);

      if (!address) {
        setError('Please connect your wallet');
        return;
      }

      // if (!isContractReady || isInitializing) {  // TODO check why that check was bad
      //   setError('Contract not ready');
      //   return;
      // }

      if (!amount || !simulatedEthAmount || !convertedTokenAmount) {
        setError('Please enter an amount');
        return;
      }

      try {
        setIsProcessing(true);

        // Additional validation for sell transactions
        if (activeTab === 'sell') {
          const tokenBalance = await contract?.balanceOf(address);
          if (!tokenBalance) {
            throw new Error('Failed to fetch token balance');
          }

          const sellAmount = BigInt(convertedTokenAmount);
          if (tokenBalance < sellAmount) {
            throw new Error(
              `Insufficient token balance. You have ${
                Number(tokenBalance) / 1e6
              } tokens`,
            );
          }
        }

        // Execute the appropriate transaction based on active tab
        const result = await (activeTab === 'buy'
          ? buyTokens(convertedTokenAmount, simulatedEthAmount)
          : sellTokens(convertedTokenAmount));

        if (result?.transaction_hash) {
          toast({
            title: `${
              activeTab === 'buy' ? 'Buy' : 'Sell'
            } Transaction Submitted`,
            description: (
              <div className="flex flex-col gap-1">
                <span>Transaction has been submitted.</span>
                <a
                  href={`https://starkscan.co/tx/${result.transaction_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  View on Starkscan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ),
          });
          setAmount('');
          setSimulatedEthAmount('');
          setConvertedTokenAmount('');

          // Trigger refresh callback after successful transaction
          onTransactionSuccess?.();
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Transaction failed';

        // Format error message for display
        let displayError = errorMessage;
        if (errorMessage.includes('insufficient')) {
          displayError =
            activeTab === 'buy'
              ? 'Insufficient ETH balance for this purchase'
              : 'Insufficient token balance for this sale';
        } else if (errorMessage.includes('rejected')) {
          displayError = 'Transaction rejected by wallet';
        }

        setError(displayError);
        toast({
          title: 'Swap Failed',
          description: displayError,
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    }, [
      activeTab,
      address,
      amount,
      buyTokens,
      contract,
      convertedTokenAmount,
      isContractReady,
      isInitializing,
      onTransactionSuccess,
      sellTokens,
      simulatedEthAmount,
      toast,
    ]);

    // Update button disabled check with logging
    const isButtonDisabled = useMemo(() => {
      const disabled =
        !address ||
        !debouncedAmount ||
        !simulatedEthAmount ||
        isProcessing ||
        isLoading ||
        !!error;

      return disabled;
    }, [
      address,
      debouncedAmount,
      simulatedEthAmount,
      isProcessing,
      isLoading,
      error,
    ]);

    // Update button text to show ABI loading state
    const buttonText = useMemo(() => {
      if (isAbiLoading) return 'Loading Contract...';
      if (isLoading) return 'Simulating...';
      if (isProcessing) return 'Processing...';
      if (abiError) return 'Swap';  // todo Fix here
      if (error) return 'Error';
      if (!address) return 'Connect Wallet';
      if (!debouncedAmount) return 'Enter Amount';
      return 'Swap';
    }, [
      isAbiLoading,
      isLoading,
      isProcessing,
      abiError,
      error,
      address,
      debouncedAmount,
    ]);

    const buttonStyle = useMemo(
      () =>
        cn(
          'w-full font-medium',
          isLeftCurve
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
            : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600',
        ),
      [isLeftCurve],
    );

    // Add ABI error handling
    useEffect(() => {
      if (abiError) {
        console.error('Failed to load contract ABI:', abiError);
        toast({
          title: 'Contract Error',
          description:
            'Failed to load contract interface. Please try again later.',
          variant: 'destructive',
        });
      }
    }, [abiError, toast]);

    return (
      <div className={cn('p-6 space-y-4', className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center gap-2">
            <ArrowDownUp
              className={cn(
                'h-4 w-4',
                isLeftCurve ? 'text-yellow-500' : 'text-purple-500',
              )}
            />
            Trade ${agent.symbol}
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.open('https://app.avnu.fi', '_blank')}
          >
            <LinkIcon className="h-3 w-3" />
            Get ETH
            <ExternalLink className="h-3 w-3 opacity-50" />
          </Button>
        </div>

        <Tabs
  defaultValue="buy"
  className="w-full"
  onValueChange={(value) => {
    setActiveTab(value);
    setError(null);
    setAmount('');
    setSimulatedEthAmount('');
    setConvertedTokenAmount('');
  }}
>
  <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 mb-8">
    <div className="col-span-3 flex justify-center w-full h-12 bg-[#F6ECE7] dark:bg-[#F6ECE7]/30 rounded-full p-1">
      <TabsTrigger
        value="buy"
        className={cn(
          'flex-1 h-full rounded-full transition-all',
          'data-[state=active]:shadow-sm',
          'data-[state=active]:bg-white dark:data-[state=active]:bg-[#e8e1d9]/70',
          isLeftCurve
            ? 'data-[state=active]:text-yellow-500 hover:text-yellow-500/80'
            : 'data-[state=active]:text-blue-500 hover:text-blue-500/80',
        )}
      >
        Buy
      </TabsTrigger>
      <TabsTrigger
        value="sell"
        className={cn(
          'flex-1 h-full rounded-full transition-all',
          'data-[state=active]:shadow-sm',
          'data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700',
          isLeftCurve
            ? 'data-[state=active]:text-yellow-500 hover:text-yellow-500/80'
            : 'data-[state=active]:text-blue-500 hover:text-blue-500/80',
        )}
      >
        Sell
      </TabsTrigger>
    </div>
  </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <SwapInput
              label={`Purchase $${agent.symbol}`}
              balance={`${Number(tokenBalance) / 1e6}`}
              value={amount}
              onChange={(value) => {
                const num = parseFloat(value);
                if (value === '' || (!isNaN(num) && isFinite(num))) {
                  setAmount(value);
                  setError(null);
                }
              }}
              isLeftCurve={isLeftCurve}
            />

            <SwapDivider isLeftCurve={isLeftCurve} />

            <SwapInput
              label="Required ETH"
              balance={`${Number(ethBalance) / 1e18}`}
              value={
                simulatedEthAmount
                  ? (Number(simulatedEthAmount) / 1e18).toString()
                  : ''
              }
              readOnly
              isLeftCurve={isLeftCurve}
            />

            {error && (
              <ErrorMessage message={error} isLeftCurve={isLeftCurve} />
            )}

            <Button
              className={buttonStyle}
              size="lg"
              onClick={handleSwap}
              disabled={isButtonDisabled}
            >
              {buttonText}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Price Impact</span>
              <span className="font-mono">~2.5%</span>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <SwapInput
              label={`Pay with $${agent.symbol}`}
              balance={`${Number(tokenBalance) / 1e6} `}
              value={amount}
              onChange={(value) => {
                const num = parseFloat(value);
                if (value === '' || (!isNaN(num) && isFinite(num))) {
                  setAmount(value);
                  setError(null);
                }
              }}
              isLeftCurve={isLeftCurve}
            />

            <SwapDivider isLeftCurve={isLeftCurve} />

            <SwapInput
              label="Receive ETH"
              balance={`${Number(ethBalance) / 1e18}`}
              value={
                simulatedEthAmount
                  ? (Number(simulatedEthAmount) / 1e18).toString()
                  : ''
              }
              readOnly
              isLeftCurve={isLeftCurve}
            />

            {error && (
              <ErrorMessage message={error} isLeftCurve={isLeftCurve} />
            )}

            <Button
              className={buttonStyle}
              size="lg"
              onClick={handleSwap}
              disabled={isButtonDisabled}
            >
              {buttonText}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Price Impact</span>
              <span className="font-mono">~2.5%</span>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground border-t border-border pt-3">
          * Price increases with each purchase due to bonding curve
        </div>
      </div>
    );
  },
);
SwapWidget.displayName = 'SwapWidget';
