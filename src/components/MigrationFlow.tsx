import { Address } from "viem";
import { ExternalLink } from "lucide-react";
import { truncateAddress } from "../utils/address";
import { Profile } from "@circles-sdk/profiles";
import { AvatarRow, TokenBalanceRow, TrustRelationRow } from "@circles-sdk/data";
import { CopyButton } from "./CopyButton";
import { GetInvited } from "./GetInvited";
import { MigrationState } from "../types/migration";
import { useState } from "react";
import { CreateProfile } from "./CreateProfile";
import { Sdk } from "@circles-sdk/sdk";
import { STEP_CONFIG } from "../flow/steps";

interface MigrationFlowProps {
    address: Address;
    profile: Profile;
    pushState: (state: MigrationState) => void;
    circlesBalance: TokenBalanceRow[];
    trustConnections: TrustRelationRow[];
    state: MigrationState;
    invitations: AvatarRow[];
    circlesSdkRunner: Sdk;
}

export function MigrationFlow({ address, profile, state, pushState, circlesBalance, trustConnections, invitations, circlesSdkRunner }: MigrationFlowProps) {
  const [selectedInviter, setSelectedInviter] = useState<`0x${string}` | null>(null);
  const [draftProfile, setDraftProfile] = useState<Profile>({ name:"", description:"", previewImageUrl:"", imageUrl:"" });
  const [profileErrors, setProfileErrors] = useState<string[]>([]);

  const ctx = {
    address,
    sdk: circlesSdkRunner,
    invitations,
    selectedInviter,
    draftProfile,
    profileErrors,
  };

  const step = STEP_CONFIG[state];
  const canProceed = step.guard ? step.guard(ctx) : true;

  const handlePrimary = async () => {
    if (!canProceed) return;
    try {
      if (step.onNext) await step.onNext(ctx);
      const next =
        typeof step.next === "function" ? step.next(ctx) : step.next;
      if (next) pushState(next);
    } catch (e) {
      console.error(e);
    }
  };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Status Header */}
            <div className="bg-green-50 border-b border-green-100 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">{step.title}</h2>
                <p className="text-sm text-gray-600">{step.description}</p>
            </div>

            {/* Content */}
            <div className="flex flex-col w-full p-6 space-y-4">
                {state === "selecting-inviter" && (
                    <GetInvited
                        invitations={invitations}
                        onInviterSelected={setSelectedInviter}
                    />
                )}
                {state === "create-profile" && (
                    <CreateProfile profile={draftProfile}
                    onChange={setDraftProfile}
                    onValidityChange={setProfileErrors} />
                )}

                {state !== "selecting-inviter" && state !== "create-profile" && (
                    <>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-700">Avatar</h3>
                            {state === "ready-to-migrate" && (
                                <div className="flex items-center space-x-2">
                                    <span className="badge badge-xs badge-error">{invitations.length} invitation{invitations.length !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                            <div className="flex items-center space-x-2">
                                <img src={profile.previewImageUrl} alt="Avatar" className="w-8 h-8 rounded-full" />
                                <div className="flex flex-col space-x-2">
                                    {profile.name}
                                    <span className="font-mono text-sm text-gray-900">
                                        {truncateAddress(address)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <CopyButton text={address} />
                                <a href={`https://explorer.aboutcircles.com/avatar/${address}`} target="_blank" rel="noopener noreferrer"
                                    className="btn btn-sm btn-ghost btn-circle"
                                    title="View on explorer"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Balance</h3>
                                <div className="text-xl font-semibold text-gray-900">
                                    {circlesBalance.reduce((acc, balance) => acc + balance.circles, 0).toFixed(2)} CRC
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Trust Connections</h3>
                                <div className="text-xl font-semibold text-gray-900">
                                    {trustConnections.length} trust{trustConnections.length > 1 ? "s" : ""}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex flex-col items-center space-y-3">
                    <button
                        onClick={() => handlePrimary()}
                        className="btn btn-sm btn-primary"
                        disabled={state === "ready-to-migrate" && invitations.length === 0 || !canProceed}
                    >
                        {step.cta}
                    </button>

                    {state === "ready-to-migrate" && invitations.length === 0 && (
                        <a
                            href="https://circles.garden/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            <span>Get invited to Circles</span>
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            </div>
        </div >
    );
}