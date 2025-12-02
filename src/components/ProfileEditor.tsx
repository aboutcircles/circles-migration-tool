import { useRef } from "react";
import { Profile } from "@circles-sdk/profiles";
import { Plus } from "lucide-react";

interface ProfileEditorProps {
    profile: Profile;
    onProfileChange: (profile: Profile) => void;
}

const NAME_MAX = 36;
const DESC_MAX = 500;

export function ProfileEditor({ profile, onProfileChange }: ProfileEditorProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (field: keyof Profile, value: string) => {
        onProfileChange({ ...profile, [field]: value });
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            onProfileChange({
                ...profile,
                previewImageUrl: dataUrl,
                imageUrl: dataUrl,
            });
        };
        reader.readAsDataURL(file);
    };

    const nameLen = (profile.name || "").length;
    const descLen = (profile.description || "").length;
    const nameMissing = nameLen === 0;

    return (
        <section className="w-full">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Avatar */}
                <div className="md:col-span-1">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img
                                src={profile.previewImageUrl || "/profile.svg"}
                                alt="Profile avatar"
                                className="w-24 h-24 rounded-full object-cover ring-1 ring-base-300"
                            />

                            <button
                                type="button"
                                aria-label="Upload profile image"
                                onClick={() => fileInputRef.current?.click()}
                                className="btn btn-primary btn-circle btn-sm absolute -bottom-1 -right-1 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Plus className="w-4 h-4" />
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="md:col-span-2 space-y-4">
                    {/* Name */}
                    <div className="form-control w-full">
                        <label htmlFor="name" className="label">
                            <span className="label-text">
                                Name <span className="text-error">*</span>
                            </span>
                            <span className="label-text-alt">
                                {nameLen}/{NAME_MAX}
                            </span>
                        </label>

                        <input
                            id="name"
                            type="text"
                            value={profile.name || ""}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            maxLength={NAME_MAX}
                            required
                            aria-invalid={nameMissing}
                            aria-describedby="name-help"
                            className={`input input-bordered w-full ${nameMissing ? "input-error" : ""
                                }`}
                            placeholder="Enter your name"
                        />
                    </div>

                    {/* Description */}
                    <div className="form-control w-full">
                        <label htmlFor="description" className="label">
                            <span className="label-text">Description</span>
                            <span className="label-text-alt">
                                {descLen}/{DESC_MAX}
                            </span>
                        </label>

                        <textarea
                            id="description"
                            value={profile.description || ""}
                            onChange={(e) => handleInputChange("description", e.target.value)}
                            maxLength={DESC_MAX}
                            rows={5}
                            aria-describedby="desc-help"
                            className="textarea textarea-bordered w-full min-h-32"
                            placeholder="Tell others about yourself"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
