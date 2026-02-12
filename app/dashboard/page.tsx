import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getDashboardData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: savedCourses } = await supabase
        .from("saved_courses")
        .select("*, courses(*)")
        .eq("user_id", user.id);

    const { data: searchHistory } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

    return { user, savedCourses, searchHistory };
}

export default async function DashboardPage() {
    const { user, savedCourses, searchHistory } = await getDashboardData();

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user.email}</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Search History</h2>
                    <div className="space-y-2">
                        {searchHistory?.length ? (
                            searchHistory.map((item) => (
                                <Card key={item.id}>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base">{item.query}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">No recent searches.</p>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Saved Courses</h2>
                    <div className="space-y-2">
                        {savedCourses?.length ? (
                            savedCourses.map((item: any) => (
                                <Card key={item.id}>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base">{item.courses.course_code}: {item.courses.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-sm text-muted-foreground line-clamp-2">{item.courses.description}</p>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">No saved courses.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
