import { Check, Copy } from "lucide-react";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";

export function CopyButton({ text }: { text: string }) {
    const { copied, copy } = useCopyToClipboard();

    return (
        <button
            onClick={() => copy(text)}
            className="btn btn-sm btn-ghost btn-circle"
            title="Copy address"
        >
            {copied ? (
                <Check className="w-4 h-4" />
            ) : (
                <Copy className="w-4 h-4" />
            )}
        </button>
    );
}
