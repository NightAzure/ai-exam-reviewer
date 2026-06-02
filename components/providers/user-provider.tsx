'use client';

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { User } from "@/types/user";
import { createClient } from "@/utils/supabase/client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import useSWR from "swr";

interface UserContextType {
    user: User | null;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, isLoading: true });

// Fetcher lives outside the component so it's a stable reference.
// SWR passes the key tuple as the argument.
async function fetchProfile([, userId]: [string, string]): Promise<Omit<User, "email"> | null> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("id, username, first_name, second_name, role, updated_at")
        .eq("id", userId)
        .single();
    if (error || !data) return null;
    return data as Omit<User, "email">;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    // Auth state from onAuthStateChange — reactive, no network call needed.
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [authEmail, setAuthEmail] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const supabase = useMemo(() => createClient(), []);

    // Profile data via SWR — cached in localStorage by our SWRProvider.
    // Key is null when not logged in, so SWR skips the fetch.
    const { data: profile, isLoading: profileLoading } = useSWR<Omit<User, "email"> | null>(
        authUserId ? ["user-profile", authUserId] : null,
        fetchProfile,
        { revalidateOnMount: true },
    );

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                if (!session?.user) {
                    setAuthUserId(null);
                    setAuthEmail(null);
                } else {
                    setAuthUserId(session.user.id);
                    setAuthEmail(session.user.email ?? null);
                }
                setAuthLoading(false);
            },
        );
        return () => subscription.unsubscribe();
    }, [supabase]);

    // Combine auth state + profile row into the User shape the app expects.
    const user: User | null =
        profile && authUserId ? { ...profile, email: authEmail } : null;

    // Still loading if: auth hasn't resolved yet, or auth resolved with a user
    // but the profile hasn't come in yet (undefined = not fetched, null = not found).
    const isLoading = authLoading || (authUserId !== null && profileLoading && profile === undefined);

    return (
        <UserContext.Provider value={{ user, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUser = () => useContext(UserContext);
