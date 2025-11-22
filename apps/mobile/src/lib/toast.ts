import type { SonnerConfig, SonnerUpdate } from "@/types/sonner";

type ShowSonnerFn = (config: Omit<SonnerConfig, "id">) => string;
type UpdateSonnerFn = (id: string, updates: SonnerUpdate) => void;

class ToastAdapter {
    private static showFn: ShowSonnerFn | null = null;
    private static updateFn: UpdateSonnerFn | null = null;

    static init(show: ShowSonnerFn, update: UpdateSonnerFn) {
        this.showFn = show;
        this.updateFn = update;
    }

    static loading(message: string, options?: { id?: string }): string {
        if (options?.id && this.updateFn) {
            this.updateFn(options.id, {
                title: message,
                type: "loading",
                persistent: true,
            });
            return options.id;
        }
        if (!this.showFn) return "";
        return this.showFn({
            title: message,
            type: "loading",
            persistent: true,
        });
    }

    static success(message: string, options?: { id?: string; duration?: number }) {
        if (options?.id && this.updateFn) {
            this.updateFn(options.id, {
                title: message,
                type: "success",
                duration: options.duration,
                persistent: false,
            });
            return options.id;
        }
        if (this.showFn) {
            return this.showFn({
                title: message,
                type: "success",
                duration: options?.duration,
            });
        }
        return "";
    }

    static error(message: string, options?: { id?: string; duration?: number }) {
        if (options?.id && this.updateFn) {
            this.updateFn(options.id, {
                title: message,
                type: "error",
                duration: options.duration,
                persistent: false,
            });
            return options.id;
        }
        if (this.showFn) {
            return this.showFn({
                title: message,
                type: "error",
                duration: options?.duration,
            });
        }
        return "";
    }
}

export const toast = ToastAdapter;
