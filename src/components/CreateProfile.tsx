import { useEffect } from "react";
import { Profile } from "@circles-sdk/profiles";
import { ProfileEditor } from "./ProfileEditor";
import { validateProfile } from "../utils/validation";

interface CreateProfileProps {
    profile: Profile;
    onChange: (p: Profile) => void;
    onValidityChange?: (errors: string[]) => void;
}

export function CreateProfile({ profile, onChange, onValidityChange }: CreateProfileProps) {
    useEffect(() => {
        let alive = true;
        (async () => {
            const errs = await validateProfile(profile);
            if (alive) onValidityChange?.(errs);
        })();
        return () => { alive = false; };
    }, [profile, onValidityChange]);

    return (
        <div className="max-w-2xl mx-auto">
            <ProfileEditor profile={profile} onProfileChange={onChange} />
        </div>
    );
}
