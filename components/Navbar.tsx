import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Search, BookOpen, LogOut, User } from "lucide-react";

export default async function Navbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                    <Search className="h-6 w-6" />
                    <span>NYU Search</span>
                </Link>
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
                                Dashboard
                            </Link>
                            <form action="/auth/signout" method="post">
                                <button className="text-sm font-medium text-muted-foreground hover:text-foreground">
                                    Sign Out
                                </button>
                            </form>
                        </>
                    ) : (
                        <Link href="/login" className="text-sm font-medium hover:underline underline-offset-4">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}
