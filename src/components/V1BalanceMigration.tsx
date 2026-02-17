import { useState, useEffect, useCallback } from "react";
import { Address } from "viem";
import { TokenBalanceRow } from "@circles-sdk/data";
import { Sdk } from "@circles-sdk/sdk";
import { truncateAddress } from "../utils/address";
import toast from "react-hot-toast";

interface V1BalanceMigrationProps {
    address: Address;
    circlesBalance: TokenBalanceRow[];
    circlesSdkRunner: Sdk;
    onMigrationComplete?: () => Promise<void>;
}

interface ClassifiedBalance {
    tokenAddress: string;
    tokenOwner: string;
    attoCrc: string;
    circles: number;
    ownerVersion: number | null;
}

export function V1BalanceMigration({ address, circlesBalance, circlesSdkRunner, onMigrationComplete }: V1BalanceMigrationProps) {
    const [eligibleBalances, setEligibleBalances] = useState<ClassifiedBalance[]>([]);
    const [ineligibleBalances, setIneligibleBalances] = useState<ClassifiedBalance[]>([]);
    const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
    const [eligibilityError, setEligibilityError] = useState<string | null>(null);
    const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationComplete, setMigrationComplete] = useState(false);

    const checkEligibility = useCallback(async () => {
        const v1Balances = circlesBalance.filter(
            (b) => b.version === 1 && BigInt(b.attoCrc) > 0n
        );

        if (v1Balances.length === 0) {
            setEligibleBalances([]);
            setIneligibleBalances([]);
            return;
        }

        setIsCheckingEligibility(true);
        setEligibilityError(null);

        try {
            const uniqueOwners = [...new Set(v1Balances.map((b) => b.tokenOwner.toLowerCase() as `0x${string}`))];
            const ownerInfos = await circlesSdkRunner.data.getAvatarInfoBatch(uniqueOwners);
            const ownerVersionMap = new Map(
                ownerInfos.map((info) => [info.avatar.toLowerCase(), info.version])
            );

            const eligible: ClassifiedBalance[] = [];
            const ineligible: ClassifiedBalance[] = [];

            for (const balance of v1Balances) {
                const ownerLower = balance.tokenOwner.toLowerCase();
                const isSelf = ownerLower === address.toLowerCase();
                const ownerVersion = ownerVersionMap.get(ownerLower) ?? null;
                const canMigrate = isSelf || ownerVersion === 2;

                const row: ClassifiedBalance = {
                    tokenAddress: balance.tokenAddress.toLowerCase(),
                    tokenOwner: balance.tokenOwner.toLowerCase(),
                    attoCrc: balance.attoCrc,
                    circles: balance.circles,
                    ownerVersion,
                };

                if (canMigrate) {
                    eligible.push(row);
                } else {
                    ineligible.push(row);
                }
            }

            setEligibleBalances(eligible);
            setIneligibleBalances(ineligible);
            setSelectedTokens(new Set(eligible.map((b) => b.tokenAddress)));
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Failed to check eligibility";
            setEligibilityError(msg);
            console.error("Eligibility check error:", error);
        } finally {
            setIsCheckingEligibility(false);
        }
    }, [circlesBalance, circlesSdkRunner, address]);

    useEffect(() => {
        checkEligibility();
    }, [checkEligibility]);

    useEffect(() => {
        setMigrationComplete(false);
    }, [address]);

    const handleMigrate = async () => {
        if (selectedTokens.size === 0 || isMigrating) return;

        setIsMigrating(true);
        try {
            const tokenAddresses = Array.from(selectedTokens) as `0x${string}`[];
            await toast.promise(
                circlesSdkRunner.migrateV1Tokens(address as `0x${string}`, tokenAddresses),
                {
                    loading: "Migrating v1 token balances\u2026",
                    success: "Token balance migration complete!",
                    error: () => "Token migration failed, please reach out to support on Discord",
                }
            );
            setMigrationComplete(true);
            if (onMigrationComplete) {
                await onMigrationComplete();
            }
        } catch (error) {
            console.error("Migration error:", error);
        } finally {
            setIsMigrating(false);
        }
    };

    const hasNoV1Balances = !isCheckingEligibility && !eligibilityError && eligibleBalances.length === 0 && ineligibleBalances.length === 0;

    return (
        <>
            <div className="py-4 px-2">
                <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2">
                    V1 Balance Migration
                </h2>
                <p className="text-sm sm:text-base text-base-content/70">
                    Migrate your v1 token balances to v2 Circles
                </p>
            </div>

            <div className="flex flex-col w-full bg-white border border-base-300 sm:px-10 px-6 py-8 rounded-2xl shadow-lg">
                {isCheckingEligibility && (
                    <div className="flex flex-col items-center py-12">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                        <p className="mt-4 text-sm text-base-content/70">Checking token eligibility...</p>
                    </div>
                )}

                {eligibilityError && !isCheckingEligibility && (
                    <div className="alert alert-error rounded-xl">
                        <span>{eligibilityError}</span>
                        <button className="btn btn-sm btn-ghost" onClick={checkEligibility}>Retry</button>
                    </div>
                )}

                {hasNoV1Balances && (
                    <div className="text-center py-12">
                        <p className="text-lg font-medium text-base-content/60">No v1 token balances found</p>
                        <p className="text-sm text-base-content/40 mt-2">
                            Your account does not hold any v1 Circles tokens to migrate.
                        </p>
                    </div>
                )}

                {migrationComplete && (
                    <div className="alert alert-success rounded-xl mb-6">
                        <span>Your selected v1 token balances have been migrated to v2!</span>
                    </div>
                )}

                {!isCheckingEligibility && eligibleBalances.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-primary mb-2">
                            Eligible for Migration ({eligibleBalances.length})
                        </h3>
                        <p className="text-sm text-base-content/60 mb-4">
                            These v1 tokens can be migrated to v2. Select the ones you want to migrate.
                        </p>

                        <div className="flex items-center gap-2 mb-3">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-sm"
                                checked={selectedTokens.size === eligibleBalances.length && eligibleBalances.length > 0}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedTokens(new Set(eligibleBalances.map(b => b.tokenAddress)));
                                    } else {
                                        setSelectedTokens(new Set());
                                    }
                                }}
                            />
                            <span className="text-sm font-medium">Select all</span>
                        </div>

                        <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden">
                            {eligibleBalances.map((balance) => (
                                <label
                                    key={balance.tokenAddress}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-base-200/50 cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-primary checkbox-sm"
                                            checked={selectedTokens.has(balance.tokenAddress)}
                                            onChange={(e) => {
                                                const next = new Set(selectedTokens);
                                                if (e.target.checked) {
                                                    next.add(balance.tokenAddress);
                                                } else {
                                                    next.delete(balance.tokenAddress);
                                                }
                                                setSelectedTokens(next);
                                            }}
                                        />
                                        <div>
                                            <span className="font-mono text-xs text-base-content/70">
                                                {truncateAddress(balance.tokenOwner as Address)}
                                            </span>
                                            {balance.tokenOwner === address.toLowerCase() && (
                                                <span className="badge badge-sm badge-primary ml-2">You</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-bold text-primary">
                                        {balance.circles.toFixed(2)} <span className="text-sm font-normal">CRC</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {!isCheckingEligibility && ineligibleBalances.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-base-content/50 mb-2">
                            Not Yet Eligible ({ineligibleBalances.length})
                        </h3>
                        <p className="text-sm text-base-content/40 mb-4">
                            These tokens cannot be migrated yet because their owners have not migrated to v2.
                        </p>
                        <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden opacity-60">
                            {ineligibleBalances.map((balance) => (
                                <div
                                    key={balance.tokenAddress}
                                    className="flex items-center justify-between px-4 py-3"
                                >
                                    <span className="font-mono text-xs text-base-content/50">
                                        {truncateAddress(balance.tokenOwner as Address)}
                                    </span>
                                    <span className="font-medium text-base-content/50">
                                        {balance.circles.toFixed(2)} CRC
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isCheckingEligibility && eligibleBalances.length > 0 && !migrationComplete && (
                    <div className="flex flex-col items-center mt-4">
                        <button
                            onClick={handleMigrate}
                            disabled={selectedTokens.size === 0 || isMigrating}
                            className="btn btn-neutral btn-lg rounded-xl shadow-md hover:shadow-lg transition-all w-full sm:w-auto min-w-[200px]"
                        >
                            {isMigrating
                                ? "Migrating\u2026"
                                : `Migrate ${selectedTokens.size} token${selectedTokens.size !== 1 ? "s" : ""}`
                            }
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
